import * as t from '@babel/types';
import { Binding } from './bindings';
import getFirstUnsafeLocation from './getFirstUnsafeLocation';
import { NodePath, Scope } from '@babel/traverse';
import * as Babel from '@babel/core';
import { replaceWithAndPreserveComments } from '@resugar/helper-comments';

export interface Options {
  onWarn?: (node: t.Node, code: string, message: string) => void;
  forceDefaultExport?: boolean;
  safeFunctionIdentifiers?: Array<string>;
}

export default function(): Babel.PluginItem {
  return {
    name: '@resugar/codemod-modules-commonjs',
    visitor: {
      Program(path: NodePath<t.Program>, state?: { opts?: Options }): void {
        unwrapIIFE(path);
        removeUseStrictDirective(path);
        rewriteImportsAndExports(
          path,
          state && state.opts ? state.opts.safeFunctionIdentifiers : undefined,
          (state && state.opts && state.opts.forceDefaultExport) || false
        );
      },

      ReferencedIdentifier(
        path: NodePath<t.Identifier>,
        state?: { opts?: Options }
      ): void {
        // TODO: Warn about `require`, `module`, and `exports` global references.
        let { node } = path;
        let onWarn = (state && state.opts && state.opts.onWarn) || (() => {});

        if (node.name === 'require' && !path.scope.hasBinding('require')) {
          let source = extractRequirePathNode(path.parent);

          if (source) {
            onWarn(
              path.parent,
              'unsupported-import',
              `Unsupported 'require' call cannot be transformed into an import`
            );
          }
        } else if (node.name === 'exports') {
          onWarn(
            node,
            'unsupported-export',
            `Unsupported export cannot be turned into an 'export' statement`
          );
        }
      }
    }
  } as Babel.PluginItem;
}

/**
 * Unwrap an IIFE at program scope if that's the only thing that's there.
 *
 *   (function() {
 *     // All program body here.
 *   })();
 */
function unwrapIIFE(path: NodePath<t.Program>) {
  let { node } = path;
  let iife = extractModuleIIFE(node);

  if (!iife) {
    return;
  }

  node.body = iife.body.body;
}

/**
 * Remove a 'use strict' directive in `path`'s body.
 */
function removeUseStrictDirective(
  path: NodePath<t.Program> | NodePath<t.BlockStatement>
) {
  let directives = path.node.directives;

  for (let i = 0; i < directives.length; i++) {
    let directive = directives[i];

    if (directive.value.value === 'use strict') {
      directives.splice(i, 1);
    }
  }
}

/**
 * Re-write requires as imports/exports and exports sets as export statements.
 */
function rewriteImportsAndExports(
  path: NodePath<t.Program>,
  safeFunctionIdentifiers: Array<string> = [],
  forceDefaultExport: boolean
) {
  const body = path.get('body');

  if (!Array.isArray(body)) {
    throw new Error(`expected body paths from program node, got: ${body}`);
  }

  if (forceDefaultExport) {
    rewriteStatementsAsDefaultExport(path);
  } else {
    for (const statement of body) {
      rewriteAsExport(statement);
    }
  }

  const collectedDefaultImportNames: Array<string> = [];
  const firstUnsafeLocation = getFirstUnsafeLocation(path, [
    'require',
    ...safeFunctionIdentifiers
  ]);

  for (const statement of body) {
    rewriteAsImport(
      statement,
      firstUnsafeLocation,
      collectedDefaultImportNames
    );
  }

  removeDefaultAccesses(path, collectedDefaultImportNames);
}

/**
 * Rewrites the exports for a file, intentionally converting to a default export
 * with the same value as the previous module.exports.
 */
function rewriteStatementsAsDefaultExport(programPath: NodePath<t.Program>) {
  const exportPaths: Array<NodePath> = [];

  programPath.traverse({
    'MemberExpression|Identifier|ThisExpression'(
      path:
        | NodePath<t.MemberExpression>
        | NodePath<t.Identifier>
        | NodePath<t.ThisExpression>
    ): void {
      if (isExportsObject(path)) {
        exportPaths.push(path);
        path.skip();
      }
    }
  } as Babel.Visitor);

  if (exportPaths.length === 0) {
    return;
  }

  // Turn a unique `module.exports` line into a single `export default` statement.
  if (exportPaths.length === 1) {
    const exportPath = exportPaths[0];
    const enclosingStatement = getEnclosingStatement(exportPath);
    if (
      enclosingStatement.isExpressionStatement() &&
      t.isAssignmentExpression(enclosingStatement.node.expression) &&
      enclosingStatement.node.expression.left === exportPath.node
    ) {
      rewriteAssignmentToDefaultExport(enclosingStatement);
      return;
    }
  }

  const exportsIdentifier = generateUidIdentifier(
    programPath.scope,
    'defaultExport'
  );
  const firstStatement = getEnclosingStatement(exportPaths[0]);
  const lastStatement = getEnclosingStatement(
    exportPaths[exportPaths.length - 1]
  );

  lastStatement.scope.registerDeclaration(
    firstStatement.insertBefore(
      t.variableDeclaration('var', [
        t.variableDeclarator(exportsIdentifier, t.objectExpression([]))
      ])
    )[0]
  );

  for (const exportPath of exportPaths) {
    replaceWithAndPreserveComments(exportPath, exportsIdentifier);
  }

  lastStatement.insertAfter(t.exportDefaultDeclaration(exportsIdentifier));
}

function getEnclosingStatement(path: NodePath): NodePath<t.Statement> {
  let resultPath = path;
  while (!t.isProgram(resultPath.parentPath.node)) {
    resultPath = resultPath.parentPath;
  }
  return resultPath as NodePath<t.Statement>;
}

function rewriteAsExport(path: NodePath): void {
  if (!path.isExpressionStatement()) {
    return;
  }

  const expression = path.get('expression');

  if (!expression.isAssignmentExpression()) {
    return;
  }

  const left = expression.get('left');
  const right = expression.get('right');

  if (isExportsObject(left)) {
    rewriteSingleExportAsDefaultExport(path);
  } else if (left.isMemberExpression() && !left.node.computed) {
    if (!isExportsObject(left.get('object'))) {
      return;
    }

    if (right.isFunctionExpression()) {
      rewriteNamedFunctionExpressionExport(path);
    } else if (t.isIdentifier(right)) {
      rewriteNamedIdentifierExport(path);
    } else {
      rewriteNamedValueExport(path);
    }
  }
}

function isExportsObject(path: NodePath): boolean {
  const { node } = path;

  if (t.isMemberExpression(node)) {
    return (
      !path.scope.hasBinding('module') &&
      t.isIdentifier(node.object, { name: 'module' }) &&
      t.isIdentifier(node.property, { name: 'exports' })
    );
  } else if (t.isIdentifier(node, { name: 'exports' })) {
    return !path.scope.hasBinding('exports');
  } else {
    return isTopLevelThis(path);
  }
}

function isTopLevelThis(path: NodePath): boolean {
  if (!path.isThisExpression()) {
    return false;
  }
  let ancestor: NodePath = path;
  while (!t.isProgram(ancestor.node)) {
    if (
      t.isFunction(ancestor.node) &&
      !t.isArrowFunctionExpression(ancestor.node)
    ) {
      return false;
    }
    ancestor = ancestor.parentPath;
  }
  return true;
}

function mapExportObject(node: t.Node): Array<t.ExportDeclaration> | undefined {
  if (!t.isObjectExpression(node)) {
    return undefined;
  }

  const result: Array<t.ExportDeclaration> = [];

  for (const property of node.properties) {
    // Don't allow object methods or spread elements, i.e.
    //
    //   module.exports = { ...a, b() {} };
    //
    if (!t.isObjectProperty(property)) {
      return undefined;
    }

    // Don't allow computed properties, i.e.
    //
    //   module.exports = { [a]: b };
    //
    if (property.computed || !t.isIdentifier(property.key)) {
      return undefined;
    }

    // Don't allow destructuring patterns. I'm not sure this can actually happen,
    // but the types make me rule it out.
    if (t.isPatternLike(property.value) && !t.isIdentifier(property.value)) {
      return undefined;
    }

    // Handle simple mappings of existing bindings, i.e.
    //
    //   module.exports = { a: b, c };
    //
    if (t.isIdentifier(property.value)) {
      const lastExportDeclaration = result[result.length - 1];

      if (
        lastExportDeclaration &&
        t.isExportNamedDeclaration(lastExportDeclaration)
      ) {
        lastExportDeclaration.specifiers.push(
          t.exportSpecifier(property.value, property.key)
        );
      } else {
        result.push(
          t.exportNamedDeclaration(
            null,
            [t.exportSpecifier(property.value, property.key)],
            null
          )
        );
      }

      continue;
    }

    // Handle re-exports, i.e.
    //
    //   module.exports = { a: require('./foo') };
    //
    if (t.isCallExpression(property.value)) {
      const source = extractRequirePathNode(property.value);

      if (!source) {
        return undefined;
      }

      result.push(
        t.exportNamedDeclaration(
          null,
          [t.exportSpecifier(t.identifier('default'), property.key)],
          source
        )
      );

      continue;
    }

    result.push(
      t.exportNamedDeclaration(
        t.variableDeclaration('let', [
          t.variableDeclarator(property.key, property.value)
        ]),
        []
      )
    );
  }

  return result;
}

function rewriteSingleExportAsDefaultExport(
  path: NodePath<t.ExpressionStatement>
): void {
  const expression = path.get('expression');

  if (!expression.isAssignmentExpression()) {
    return;
  }

  const right = expression.get('right');
  const objectExports = mapExportObject(right.node);

  if (objectExports) {
    replaceWithAndPreserveComments(path, objectExports);
  } else {
    let pathNode = extractRequirePathNode(right.node);

    if (pathNode) {
      replaceWithAndPreserveComments(path, t.exportAllDeclaration(pathNode));
    } else {
      rewriteAssignmentToDefaultExport(path);
    }
  }
}

function rewriteAssignmentToDefaultExport(
  path: NodePath<t.ExpressionStatement>
): void {
  const expression = path.get('expression') as NodePath<t.AssignmentExpression>;
  const right = expression.node.right;

  replaceWithAndPreserveComments(path, t.exportDefaultDeclaration(right));
}

function rewriteNamedFunctionExpressionExport(
  path: NodePath<t.ExpressionStatement>
): boolean {
  const expression = path.get('expression') as NodePath<t.AssignmentExpression>;
  const left = expression.get('left') as NodePath<t.MemberExpression>;
  const right = expression.get('right') as NodePath<t.FunctionExpression>;
  const exportName = (left.node.property as t.Identifier).name;
  const id = right.node.id;

  const fnBinding = id ? id.name : null;
  const localId = generateUidIdentifier(path.scope, fnBinding || exportName);
  const localName = localId.name;

  if (localName === exportName) {
    if (!id) {
      right.node.id = t.identifier(exportName);
    }

    replaceWithAndPreserveComments(
      path,
      t.exportNamedDeclaration(
        t.functionDeclaration(
          t.identifier(exportName),
          right.node.params,
          right.node.body,
          right.node.generator,
          right.node.async
        ),
        [],
        null
      )
    );
  } else {
    let declaration: t.Statement = t.functionDeclaration(
      localId,
      right.node.params,
      right.node.body,
      right.node.generator,
      right.node.async
    );

    if (!id) {
      // no-op
    } else if (fnBinding === localName) {
      // no-op
    } else {
      declaration = t.variableDeclaration('let', [
        t.variableDeclarator(localId, right.node)
      ]);
    }

    replaceWithAndPreserveComments(path, [
      declaration,
      t.exportNamedDeclaration(null, [
        t.exportSpecifier(localId, t.identifier(exportName))
      ])
    ]);
  }

  return true;
}

function rewriteNamedIdentifierExport(
  path: NodePath<t.ExpressionStatement>
): boolean {
  const expression = path.get('expression') as NodePath<t.AssignmentExpression>;
  const left = expression.get('left') as NodePath<t.MemberExpression>;
  const property = left.get('property') as NodePath<t.Identifier>;
  const right = expression.get('right') as NodePath<t.Identifier>;

  let replacements: Array<t.Statement>;
  let localBinding: t.Identifier;

  if (path.scope.hasBinding(right.node.name)) {
    localBinding = right.node;

    replacements = [
      t.exportNamedDeclaration(
        null,
        [t.exportSpecifier(right.node, property.node)],
        null
      )
    ];
  } else {
    localBinding = generateUidIdentifier(path.scope, property.node.name);

    if (localBinding.name === property.node.name) {
      replacements = [
        t.exportNamedDeclaration(
          t.variableDeclaration('let', [
            t.variableDeclarator(localBinding, right.node)
          ]),
          [],
          null
        )
      ];
    } else {
      replacements = [
        t.variableDeclaration('let', [
          t.variableDeclarator(localBinding, right.node)
        ]),
        t.exportNamedDeclaration(
          null,
          [t.exportSpecifier(localBinding, property.node)],
          null
        )
      ];
    }
  }

  replaceWithAndPreserveComments(path, replacements);

  return true;
}

function rewriteNamedValueExport(
  path: NodePath<t.ExpressionStatement>
): boolean {
  const expression = path.get('expression') as NodePath<t.AssignmentExpression>;
  const left = expression.get('left') as NodePath<t.MemberExpression>;
  const property = left.get('property') as NodePath<t.Identifier>;
  const right = expression.get('right');
  const localBinding = generateUidIdentifier(path.scope, property.node.name);

  if (localBinding.name === property.node.name) {
    replaceWithAndPreserveComments(
      path,
      t.exportNamedDeclaration(
        t.variableDeclaration('let', [
          t.variableDeclarator(t.identifier(property.node.name), right.node)
        ]),
        [],
        null
      )
    );
  } else {
    let block = path.parent as t.BlockStatement;
    let nodeIndex = block.body.indexOf(path.node);

    if (nodeIndex < 0) {
      throw new Error(
        `could not locate ${path.node.type} at ${path.node.loc!.start.line}:${
          path.node.loc!.start.column
        } in its parent block`
      );
    }

    replaceWithAndPreserveComments(path, [
      t.variableDeclaration('let', [
        t.variableDeclarator(localBinding, right.node)
      ]),
      t.exportNamedDeclaration(
        null,
        [t.exportSpecifier(localBinding, t.identifier(property.node.name))],
        null
      )
    ]);
  }

  return true;
}

/**
 * Rewrite this potential import statement, considering various import styles.
 * Any new default import names are added to collectedDefaultImportNames.
 */
function rewriteAsImport(
  path: NodePath,
  firstUnsafeLocation: number,
  collectedDefaultImportNames: Array<string>
): boolean {
  if (path.scope.hasBinding('require')) {
    return false;
  }

  if (path.node && path.node.end! > firstUnsafeLocation) {
    return false;
  }

  return (
    rewriteSingleExportRequire(path, collectedDefaultImportNames) ||
    rewriteNamedExportRequire(path) ||
    rewriteDeconstructedImportRequire(path) ||
    rewriteSideEffectRequire(path)
  );
}

/**
 * Convert
 * let a = require('b');
 * to
 * import a from 'b';
 *
 * Any imported names are added to the collectedDefaultImportNames parameter.
 */
function rewriteSingleExportRequire(
  path: NodePath,
  collectedDefaultImportNames: Array<string>
): boolean {
  let { node } = path;

  if (!t.isVariableDeclaration(node)) {
    return false;
  }

  let { declarations } = node;
  let extractableDeclarations: Array<{
    declaration: t.VariableDeclarator;
    id: t.Identifier;
    pathNode: t.StringLiteral;
  }> = [];

  declarations.forEach(declaration => {
    let { id, init } = declaration;

    if (!t.isIdentifier(id) || !init) {
      return;
    }

    let pathNode = extractRequirePathNode(init);

    if (!pathNode) {
      return;
    }

    extractableDeclarations.push({
      declaration,
      id,
      pathNode
    });
  });

  if (declarations.length === 0) {
    return false;
  }

  if (declarations.length !== extractableDeclarations.length) {
    // TODO: We have to replace only part of it.
    return false;
  }

  replaceWithAndPreserveComments(
    path,
    extractableDeclarations.map(({ id, pathNode }) =>
      t.importDeclaration([t.importDefaultSpecifier(id)], pathNode)
    )
  );

  collectedDefaultImportNames.push(
    ...extractableDeclarations.map(d => d.id.name)
  );
  return true;
}

/**
 * Convert
 * let a = require('b').c;
 * to
 * import { c as a } from 'b';
 */
function rewriteNamedExportRequire(path: NodePath): boolean {
  let declaration = extractSingleDeclaration(path.node);

  if (!declaration) {
    return false;
  }

  let { id, init } = declaration;

  if (
    !t.isIdentifier(id) ||
    !init ||
    !t.isMemberExpression(init) ||
    init.computed
  ) {
    return false;
  }

  let pathNode = extractRequirePathNode(init.object);

  if (!pathNode) {
    return false;
  }

  replaceWithAndPreserveComments(
    path,
    t.importDeclaration([t.importSpecifier(id, init.property)], pathNode)
  );

  return true;
}

/**
 * Convert
 * let { a } = require('b');
 * to
 * import { a } from 'b';
 */
function rewriteDeconstructedImportRequire(path: NodePath): boolean {
  let declaration = extractSingleDeclaration(path.node);

  if (!declaration) {
    return false;
  }

  let { id, init } = declaration;

  if (!t.isObjectPattern(id) || !init) {
    return false;
  }

  let bindings = [];

  for (let property of id.properties) {
    if (t.isRestElement(property)) {
      return false;
    }

    let { key, value } = property;

    if (!t.isIdentifier(value)) {
      return false;
    }

    bindings.push(new Binding(value.name, key.name));
  }

  let pathNode = extractRequirePathNode(init);

  if (!pathNode) {
    return false;
  }

  replaceWithAndPreserveComments(
    path,
    t.importDeclaration(
      bindings.map(binding =>
        t.importSpecifier(
          t.identifier(binding.localName),
          t.identifier(binding.exportName)
        )
      ),
      pathNode
    )
  );

  return true;
}

/**
 * Convert
 * require('a');
 * to
 * import 'a';
 */
function rewriteSideEffectRequire(path: NodePath): boolean {
  let { node } = path;

  if (!t.isExpressionStatement(node)) {
    return false;
  }

  let pathNode = extractRequirePathNode(node.expression);

  if (!pathNode) {
    return false;
  }

  replaceWithAndPreserveComments(path, t.importDeclaration([], pathNode));

  return true;
}

/**
 * Remove `.default` accesses on names that are known to be default imports.
 * For example, if `let a = require('a');` became `import a from 'a';`, then
 * any usage of `a.default` should change to just `a`.
 *
 * Note that this isn't 100% correct, and being fully correct here is
 * undecidable, but it seems good enough for real-world cases.
 */
function removeDefaultAccesses(
  programPath: NodePath<t.Program>,
  defaultImportNames: ReadonlyArray<string>
) {
  programPath.traverse({
    MemberExpression(path: NodePath<t.MemberExpression>): void {
      const { object, property, computed } = path.node;
      if (computed) {
        return;
      }
      if (
        !computed &&
        t.isIdentifier(object) &&
        defaultImportNames.indexOf(object.name) !== -1 &&
        t.isIdentifier(property) &&
        property.name === 'default'
      ) {
        path.replaceWith(object);
      }
    }
  });
}

function extractSingleDeclaration(node: t.Node): t.VariableDeclarator | null {
  if (!t.isVariableDeclaration(node)) {
    return null;
  }

  if (node.declarations.length !== 1) {
    return null;
  }

  return node.declarations[0];
}

function extractRequirePathNode(node: t.Node): t.StringLiteral | null {
  if (!node || !t.isCallExpression(node)) {
    return null;
  }

  if (!t.isIdentifier(node.callee, { name: 'require' })) {
    return null;
  }

  if (node.arguments.length !== 1) {
    return null;
  }

  let arg = node.arguments[0];

  if (!t.isStringLiteral(arg)) {
    return null;
  }

  return arg;
}

/**
 * @private
 */
function extractModuleIIFE(node: t.Node): t.FunctionExpression | null {
  if (!t.isProgram(node)) {
    return null;
  }

  if (node.body.length !== 1) {
    return null;
  }

  let [statement] = node.body;

  if (!t.isExpressionStatement(statement)) {
    return null;
  }

  let { expression: call } = statement;

  if (t.isUnaryExpression(call) && call.operator === 'void') {
    // e.g. `void function(){}();`
    call = call.argument;
  }

  if (!t.isCallExpression(call)) {
    return null;
  }

  let { callee, arguments: args } = call;

  let iife;

  if (t.isFunctionExpression(callee)) {
    // e.g. `(function() {})();`
    if (args.length !== 0) {
      return null;
    }

    iife = callee;
  } else if (t.isMemberExpression(callee)) {
    // e.g. `(function() {}).call(this);`
    let { object, property, computed } = callee;

    if (computed || !t.isFunctionExpression(object)) {
      return null;
    }

    if (!t.isIdentifier(property, { name: 'call' })) {
      return null;
    }

    if (args.length !== 1 || !t.isThisExpression(args[0])) {
      return null;
    }

    iife = object;
  } else {
    return null;
  }

  if (iife.id || iife.params.length > 0 || iife.generator) {
    return null;
  }

  return iife;
}

interface ScopeWithPrivate extends Scope {
  hasLabel(label: string): boolean;
  references: { [key: string]: boolean };
  uids: { [key: string]: boolean };
}

function generateUidIdentifier(scope: Scope, name: string): t.Identifier {
  return t.identifier(generateUid(scope, name));
}

/**
 * Mimics the `@babel/traverse` implementation of `Scope#generateUid` but
 * without always prefixing with `_`, which makes it impossible for the return
 * value to match `name`.
 */
function generateUid(scope: Scope, name: string): string {
  const privateScope = scope as ScopeWithPrivate;

  for (const uid of uniquify(name)) {
    if (
      privateScope.hasLabel(uid) ||
      privateScope.hasBinding(uid) ||
      privateScope.hasGlobal(uid) ||
      privateScope.hasReference(uid)
    ) {
      continue;
    }

    const program = privateScope.getProgramParent() as ScopeWithPrivate;
    program.references[uid] = true;
    program.uids[uid] = true;

    return uid;
  }

  throw new Error(`could not find a unique name based on ${name}`);
}

function* uniquify(name: string): Iterable<string> {
  yield name;
  yield `_${name}`;

  let i = 1;
  while (true) {
    yield `${name}${i++}`;
  }
}
