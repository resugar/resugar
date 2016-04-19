import * as t from 'babel-types';
import cleanNode from '../utils/cleanNode.js';
import type Module from '../module';
import type { Node, Path, Visitor } from '../types';
import unindent from '../utils/unindent';
import { Binding, ExportSpecifierListStringBuilder, ImportSpecifierListStringBuilder } from '../bindings';
import { claim, isDeclaredName } from '../utils/scopeBindings';
import { findToken, findEndTokenBalanced } from '../utils/findTokens';

export const name = 'modules.commonjs';
export const description = 'Transform CommonJS modules into ES6 modules.';

export function visitor(module: Module): Visitor {
  metadata(module);

  return {
    Program(path: Path) {
      unwrapIIFE(path, module);
      removeUseStrictDirective(path, module);
      rewriteImportsAndExports(path, module);
    },

    ReferencedIdentifier(path: Path) {
      // TODO: Warn about `require`, `module`, and `exports` global references.
      let { node } = path;

      if (node.name === 'require' && !path.scope.hasBinding('require')) {
        let source = extractRequirePathNode(path.parent);

        if (source) {
          module.warn(
            path.parent,
            'unsupported-import',
            `Unsupported 'require' call cannot be transformed into an import`
          );
        }
      } else if (node.name === 'exports') {
        module.warn(
          node,
          'unsupported-export',
          `Unsupported export cannot be turned into an 'export' statement`
        );
      }
    }
  };
}

/**
 * Unwrap an IIFE at program scope if that's the only thing that's there.
 *
 *   (function() {
 *     // All program body here.
 *   })();
 */
function unwrapIIFE(path: Path, module: Module) {
  let { node } = path;
  let iife = extractModuleIIFE(node);

  if (!iife) {
    return;
  }

  let [ statement ] = node.body;
  let { body } = iife.body;

  node.body = body;
  metadata(module).unwrapped = cleanNode(iife);

  let tokens = module.tokensForNode(iife);
  let iifeHeaderEnd = body[0].start;
  let { index: iifeBlockStartIndex, token: iifeBlockStart } = findToken('{', tokens);

  for (let p = iifeBlockStart.end; p < iifeHeaderEnd; p++) {
    if (module.source.charAt(p) === '\n') {
      iifeHeaderEnd = p + 1;
      break;
    }
  }

  let iifeFooterStart = body[body.length - 1].end;
  let { token: iifeBlockEnd } = findEndTokenBalanced(
    '{', '}',
    tokens,
    iifeBlockStartIndex
  );

  for (let p = iifeBlockEnd.start; p > iifeFooterStart; p--) {
    if (module.source.charAt(p) === '\n') {
      if (module.source.charAt(p) === '\r') { p--; }
      iifeFooterStart = p;
      break;
    }
  }

  // `(function() {\n  foo();\n})();` -> `foo();`
  //  ^^^^^^^^^^^^^^^^^      ^^^^^^^
  module.magicString.remove(statement.start, iifeHeaderEnd);
  module.magicString.remove(iifeFooterStart, statement.end);
  unindent(module.magicString);
}

/**
 * Remove a 'use strict' directive in `path`'s body.
 */
function removeUseStrictDirective(path: Path, module: Module) {
  let directives = path.node.directives;

  for (let i = 0; i < directives.length; i++) {
    let directive = directives[i];

    if (directive.value.value === 'use strict') {
      let { start, end } = directive;

      // Eat any trailing newlines.
      while (module.source.charAt(end) === '\n') {
        end++;
      }

      module.magicString.remove(start, end);
      directives.splice(i, 1);
      metadata(module).directives.push(cleanNode(directive));
    }
  }
}

/**
 * Re-write requires as imports/exports and exports sets as export statements.
 */
function rewriteImportsAndExports(path: Path, module: Module) {
  let body = path.get('body');

  if (!Array.isArray(body)) {
    throw new Error(`expected body paths from program node, got: ${body}`);
  }

  body.forEach(statement => (
    rewriteAsExport(statement, module) ||
    rewriteAsImport(statement, module)
  ));
}

function rewriteAsExport(path: Path, module: Module): boolean {
  let { node } = path;

  if (!t.isExpressionStatement(node)) {
    return false;
  }

  let { expression } = node;

  if (!t.isAssignmentExpression(expression)) {
    return false;
  }

  let { left, right } = expression;

  if (isExportsObject(path.get('expression.left'))) {
    return rewriteSingleExportAsDefaultExport(path, module);
  } else if (t.isMemberExpression(left) && !left.computed) {
    if (!isExportsObject(path.get('expression.left.object'))) {
      return false;
    }

    if (t.isFunctionExpression(right)) {
      return rewriteNamedFunctionExpressionExport(path, module);
    } else if (t.isIdentifier(right)) {
      return rewriteNamedIdentifierExport(path, module);
    } else {
      return rewriteNamedValueExport(path, module);
    }
  } else {
    return false;
  }
}

function isExportsObject(path: Path): boolean {
  let { node } = path;

  if (t.isMemberExpression(node)) {
    return (
      !path.scope.hasBinding('module') &&
      t.isIdentifier(node.object, { name: 'module' }) &&
      t.isIdentifier(node.property, { name: 'exports' })
    );
  } else if (t.isIdentifier(node, { name: 'exports' })) {
    return !path.scope.hasBinding('exports');
  } else {
    return t.isThisExpression(node);
  }
}

function rewriteSingleExportAsDefaultExport(path: Path, module: Module): boolean {
  let {
    node,
    node: {
      expression: { right }
    }
  } = path;

  if (t.isObjectExpression(right)) {
    let bindings = [];

    for (let { key, value } of right.properties) {
      bindings.push(new Binding(value.name, key.name));
    }

    metadata(module).exports.push({
      type: 'named-export',
      bindings,
      node: cleanNode(node)
    });

    module.magicString.overwrite(
      node.start,
      node.end,
      `export ${ExportSpecifierListStringBuilder.build(bindings)};`
    );

    path.replaceWith(
      t.exportNamedDeclaration(
        null,
        bindings.map(binding => t.exportSpecifier(
          t.identifier(binding.localName),
          t.identifier(binding.exportName)
        )),
        null
      )
    );
  } else {
    let pathNode = extractRequirePathNode(right);

    if (pathNode) {
      module.magicString.overwrite(
        node.expression.start,
        node.expression.end,
        `export * from ${module.source.slice(pathNode.start, pathNode.end)}`
      );

      metadata(module).exports.push({
        type: 'namespace-export',
        bindings: [],
        node: cleanNode(node)
      });

      path.replaceWith(t.exportAllDeclaration(pathNode));
    } else {
      metadata(module).exports.push({ type: 'default-export', node: cleanNode(node) });
      module.magicString.overwrite(node.start, right.start, 'export default ');
      path.replaceWith(t.exportDefaultDeclaration(right));
    }
  }

  return true;
}

function rewriteNamedFunctionExpressionExport(path: Path, module: Module) {
  let {
    node,
    node: {
      expression: {
        left: {
          property: {name: exportName}
        },
        right,
        right: {id}
      }
    }
  } = path;

  let fnBinding = id ? id.name : null;
  let localId = claim(path.scope, fnBinding || exportName);
  let localName = localId.name;

  metadata(module).exports.push({
    type: 'named-export',
    bindings: [
      {
        exportName,
        localName
      }
    ],
    node: cleanNode(node)
  });

  let isFunctionDeclaration = true;

  if (localName === exportName) {
    // `exports.foo = function foo() {}` → `export function foo() {}`
    //  ^^^^^^^^^^^^^^                      ^^^^^^^
    module.magicString.overwrite(node.start, right.start, 'export ');

    if (!id) {
      module.magicString.insert(right.start + 'function'.length, ` ${localName}`);
      right.id = t.identifier(exportName);
    }

    right.type = 'FunctionDeclaration';
    right.expression = false;
    right.id = t.identifier(exportName);
    delete right.start;
    delete right.end;

    path.replaceWith(
      t.exportNamedDeclaration(
        right, [], null
      )
    );
  } else {
    let declaration = right;

    if (!id) {
      module.magicString.remove(node.start, right.start);
      module.magicString.insert(right.start + 'function'.length, ` ${localName}`);
      right.type = 'FunctionDeclaration';
      right.id = localId;
    } else if (fnBinding === localName) {
      right.type = 'FunctionDeclaration';
      module.magicString.remove(node.start, right.start);
    } else {
      isFunctionDeclaration = false;
      module.magicString.overwrite(node.start, right.start, `let ${localName} = `);
      declaration = t.variableDeclaration(
        'let',
        [
          t.variableDeclarator(
            localId,
            right
          )
        ]
      );
    }

    module.magicString.insert(node.end, `\nexport { ${localName} as ${exportName} };`);

    path.replaceWithMultiple([
      declaration,
      t.exportNamedDeclaration(
        null,
        [
          t.exportSpecifier(
            localId,
            t.identifier(exportName)
          )
        ]
      )
    ]);
  }

  if (isFunctionDeclaration) {
    let lastCharacterPosition = node.end - 1;

    if (module.source.charAt(lastCharacterPosition) === ';') {
      module.magicString.remove(lastCharacterPosition, node.end);
    }
  }
}

function rewriteNamedIdentifierExport(path: Path, module: Module): boolean {
  let {
    node,
    node: {
      expression: {
        left: { property },
        right
      }
    }
  } = path;

  let replacements;
  let localBinding;

  if (isDeclaredName(path.scope, right.name)) {
    localBinding = right.name;

    if (right.name === property.name) {
      module.magicString.overwrite(node.start, node.end, `export { ${right.name} };`);
    } else {
      module.magicString.overwrite(node.start, node.end, `export { ${right.name} as ${property.name} };`);
    }

    replacements = [
      t.exportNamedDeclaration(
        null,
        [t.exportSpecifier(right, property)],
        null
      )
    ];
  } else {
    localBinding = claim(path.scope, property.name).name;

    if (localBinding === property.name) {
      module.magicString.overwrite(node.start, right.start, `export let ${localBinding} = `);
      replacements = [
        t.exportNamedDeclaration(
          t.variableDeclaration(
            'let',
            [
              t.variableDeclarator(
                t.identifier(localBinding),
                right
              )
            ]
          ),
          [],
          null
        )
      ];
    } else {
      module.magicString.overwrite(node.start, right.start, `let ${localBinding} = `);
      module.magicString.insert(node.end, `\nexport { ${localBinding} as ${property.name} };`);
      replacements = [
        t.variableDeclaration(
          'let',
          [
            t.variableDeclarator(
              t.identifier(localBinding),
              right
            )
          ]
        ),
        t.exportNamedDeclaration(
          null,
          [
            t.exportSpecifier(
              t.identifier(localBinding),
              property
            )
          ],
          null
        )
      ];
    }
  }

  metadata(module).exports.push({
    type: 'named-export',
    bindings: [
      {
        exportName: property.name,
        localName: localBinding
      }
    ],
    node: cleanNode(node)
  });

  path.replaceWithMultiple(replacements);

  return true;
}

function rewriteNamedValueExport(path: Path, module: Module): boolean {
  let {
    node,
    node: {
      expression: {
        left: { property },
        right
      }
    }
  } = path;
  let localBinding = claim(path.scope, property.name).name;

  metadata(module).exports.push({
    type: 'named-export',
    bindings: [
      {
        exportName: property.name,
        localName: localBinding
      }
    ],
    node: cleanNode(node)
  });

  if (localBinding === property.name) {
    // `exports.foo = 99;` → `export let foo = 99;`
    //  ^^^^^^^^              ^^^^^^^^^^^
    module.magicString.overwrite(node.start, property.start, 'export let ');

    path.replaceWith(
      t.exportNamedDeclaration(
        t.variableDeclaration(
          'let',
          [
            t.variableDeclarator(
              t.identifier(property.name),
              right
            )
          ]
        ),
        [],
        null
      )
    );
  } else {
    // `exports.foo = 99;` → `let foo$1 = 99;`
    //  ^^^^^^^^^^^^^^        ^^^^^^^^^^^^
    module.magicString.overwrite(node.start, right.start, `let ${localBinding} = `);

    let nodeIndex = path.parent.body.indexOf(node);

    if (nodeIndex < 0) {
      throw new Error(`could not locate ${node.type} at ${node.line}:${node.column} in its parent block`);
    }

    let nextStatement = path.parent.body[nodeIndex + 1];

    // `export { foo$1 as foo };`
    let exportStatement = `export { ${localBinding} as ${property.name} };`;

    if (nextStatement) {
      // Insert before the next statement…
      module.magicString.insert(nextStatement.start, `${exportStatement}\n`);
    } else {
      // …or after the last one of the program.
      module.magicString.insert(node.end, `\n${exportStatement}`);
    }

    path.replaceWithMultiple([
      t.variableDeclaration(
        'let',
        [
          t.variableDeclarator(
            t.identifier(localBinding),
            right
          )
        ]
      ),
      t.exportNamedDeclaration(
        null,
        [
          t.exportSpecifier(
            t.identifier(localBinding),
            t.identifier(property.name)
          )
        ],
        null
      )
    ]);
  }

  return true;
}

function rewriteAsImport(path: Path, module: Module): boolean {
  if (isDeclaredName(path.scope, 'require')) {
    return false;
  }

  return (
    rewriteSingleExportRequire(path, module) ||
    rewriteNamedExportRequire(path, module) ||
    rewriteDeconstructedImportRequire(path, module) ||
    rewriteSideEffectRequire(path, module)
  );
}

function rewriteSingleExportRequire(path: Path, module: Module): boolean {
  let { node } = path;

  if (!t.isVariableDeclaration(node)) {
    return false;
  }

  let { declarations } = node;
  let extractableDeclarations = [];

  declarations.forEach(declaration => {
    let { id, init } = declaration;

    if (!t.isIdentifier(id)) {
      return;
    }

    let pathNode = extractRequirePathNode(init);

    if (!pathNode) {
      return;
    }

    extractableDeclarations.push({
      declaration, id, pathNode
    });
  });

  if (declarations.length === 0) {
    return false;
  }

  if (declarations.length !== extractableDeclarations.length) {
    // TODO: We have to replace only part of it.
    return false;
  }

  rewriteRequireAsImports(
    'default-import',
    path,
    module,
    extractableDeclarations.map(
      ({ id, pathNode }) => ({
        bindings: [new Binding(id.name, 'default')],
        pathNode
      })
    )
  );

  path.replaceWithMultiple(
    extractableDeclarations.map(({ id, pathNode }) => t.importDeclaration(
      [t.importDefaultSpecifier(id)],
      pathNode
    ))
  );

  return true;
}

function rewriteNamedExportRequire(path: Path, module: Module): boolean {
  let declaration = extractSingleDeclaration(path.node);

  if (!declaration) {
    return false;
  }

  let { id, init } = declaration;

  if (!init || !t.isMemberExpression(init) || init.computed) {
    return false;
  }

  let pathNode = extractRequirePathNode(init.object);

  if (!pathNode) {
    return false;
  }

  rewriteRequireAsImport(
    'named-import',
    path,
    module,
    [new Binding(id.name, init.property.name)],
    pathNode
  );

  path.replaceWith(
    t.importDeclaration(
      [
        t.importSpecifier(
          id, init.property
        )
      ],
      pathNode
    )
  );

  return true;
}

function rewriteDeconstructedImportRequire(path: Path, module: Module): boolean {
  let declaration = extractSingleDeclaration(path.node);

  if (!declaration) {
    return false;
  }

  let { id, init } = declaration;

  if (!t.isObjectPattern(id)) {
    return false;
  }

  let bindings = [];

  for (let { key, value } of id.properties) {
    if (!t.isIdentifier(value)) {
      return false;
    }
    bindings.push(new Binding(value.name, key.name));
  }

  let pathNode = extractRequirePathNode(init);

  if (!pathNode) {
    return false;
  }

  rewriteRequireAsImport('named-import', path, module, bindings, pathNode);

  path.replaceWith(
    t.importDeclaration(
      bindings.map(binding => t.importSpecifier(
        t.identifier(binding.localName),
        t.identifier(binding.exportName)
      )),
      pathNode
    )
  );

  return true;
}

function rewriteSideEffectRequire(path: Path, module: Module): boolean {
  let { node } = path;

  if (!t.isExpressionStatement(node)) {
    return false;
  }

  let pathNode = extractRequirePathNode(node.expression);

  if (!pathNode) {
    return false;
  }

  rewriteRequireAsImport('bare-import', path, module, [], pathNode);

  path.replaceWith(
    t.importDeclaration([], pathNode)
  );

  return true;
}

function rewriteRequireAsImport(type: string, path: Path, module: Module, bindings: Array<Binding>, pathNode: Node) {
  rewriteRequireAsImports(
    type,
    path,
    module,
    [{ bindings, pathNode }]
  );
}

function rewriteRequireAsImports(type: string, path: Path, module: Module, imports: Array<{ bindings: Array<Binding>, pathNode: Node }>) {
  let { node } = path;
  let importStatements = [];

  imports.forEach(({ bindings, pathNode }) => {
    metadata(module).imports.push({
      type,
      node: cleanNode(node),
      bindings,
      path: pathNode.value
    });

    let pathString = module.source.slice(pathNode.start, pathNode.end);

    if (bindings.length === 0) {
      importStatements.push(`import ${pathString};`);
    } else {
      importStatements.push(`import ${ImportSpecifierListStringBuilder.build(bindings)} from ${pathString};`);
    }
  });

  module.magicString.overwrite(
    node.start,
    node.end,
    importStatements.join('\n')
  );
}

function metadata(module: Module): Metadata {
  if (!module.metadata[name]) {
    module.metadata[name] = {
      imports: [],
      exports: [],
      directives: []
    };
  }
  return module.metadata[name];
}

type ImportMetadata = {
  type: string,
  node: Node,
  bindings: Array<Binding>,
  path: string,
};

type ExportMetadata = {
  type: string,
  node: Node,
  bindings: Array<Binding>,
};

type DirectiveMetadata = {
  type: string,
  node: Node,
};

type Metadata = {
  imports: Array<ImportMetadata>,
  exports: Array<ExportMetadata>,
  directives: Array<DirectiveMetadata>,
  unwrapped?: Node
};

function extractSingleDeclaration(node: Node): ?Node {
  if (!t.isVariableDeclaration(node)) {
    return null;
  }

  if (node.declarations.length !== 1) {
    return null;
  }

  return node.declarations[0];
}

function extractRequirePathNode(node: Node): ?Node {
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
function extractModuleIIFE(node: Node): ?Node {
  if (!t.isProgram(node)) {
    return null;
  }

  if (node.body.length !== 1) {
    return null;
  }

  let [ statement ] = node.body;

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
