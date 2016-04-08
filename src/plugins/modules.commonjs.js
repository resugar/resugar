import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import isMemberExpression from '../utils/isMemberExpression';
import replace from '../utils/replace';
import splice from '../utils/splice';
import type Module from '../module';
import { claim, isDeclaredName } from '../utils/scopeBindings';
import { Binding, ExportSpecifierListStringBuilder, ImportSpecifierListStringBuilder } from '../bindings';

const { Syntax, VisitorOption } = estraverse;

export const name = 'modules.commonjs';
export const description = 'Transform CommonJS modules into ES6 modules.';

type ImportMetadata = {
  type: string,
  node: Object,
  bindings: Array<Binding>,
  path: string
};

type ExportMetadata = {
  type: string,
  node: Object,
  bindings: Array<Binding>
};

type DirectiveMetadata = {
  type: string,
  node: Object
};

type Metadata = {
  imports: Array<ImportMetadata>,
  exports: Array<ExportMetadata>,
  directives: Array<DirectiveMetadata>
};

class Context extends BaseContext {
  constructor(module: Module) {
    super(name, module);
    module.metadata[name] = ({
      imports: [],
      exports: [],
      directives: []
    }: Metadata);
  }

  rewrite(node: Object): boolean {
    return (
      this.unwrapIIFE(node) ||
      this.rewriteRequire(node) ||
      this.rewriteExport(node) ||
      this.removeUseStrictDirective(node)
    );
  }

  /**
   * @private
   */
  unwrapIIFE(node: Object): boolean {
    const iife = extractModuleIIFE(node);

    if (!iife) {
      return false;
    }

    const [ statement ] = node.body;
    const { body } = iife.body;
    node.body = body;

    this.metadata.unwrapped = iife;

    const { tokens } = this.module;
    const { start, end } = this.module.tokenRangeForNode(iife);
    let iifeHeaderEnd = body[0].range[0];

    for (let i = start; i < end; i++) {
      if (tokens[i].value === '{') {
        for (let p = tokens[i].range[1]; p < iifeHeaderEnd; p++) {
          if (this.charAt(p) === '\n') {
            iifeHeaderEnd = p + 1;
            break;
          }
        }
        break;
      }
    }

    let iifeFooterStart = body[body.length - 1].range[1];

    for (let i = end - 1; i >= start; i--) {
      if (tokens[i].value === '}') {
        for (let p = tokens[i].range[0]; p > iifeFooterStart; p--) {
          if (this.charAt(p) === '\n') {
            if (this.charAt(p) === '\r') { p--; }
            iifeFooterStart = p;
            break;
          }
        }
      }
    }

    // `(function() {\n  foo();\n})();` -> `foo();`
    //  ^^^^^^^^^^^^^^^^^      ^^^^^^^
    this.remove(statement.range[0], iifeHeaderEnd);
    this.remove(iifeFooterStart, statement.range[1]);
    this.unindent();

    return false; // Don't skip the program body.
  }

  /**
   * @private
   */
  rewriteRequire(node: Object): boolean {
    if (this.module.moduleScope.variables.some(({ name }) => name === 'require')) {
      return false;
    }

    return (
      this.rewriteSingleExportRequire(node) ||
      this.rewriteNamedExportRequire(node) ||
      this.rewriteDeconstructedImportRequire(node) ||
      this.rewriteSideEffectRequire(node) ||
      this.warnAboutUnsupportedRequire(node)
    );
  }

  /**
   * @private
   */
  rewriteSingleExportRequire(node: Object): boolean {
    const { parentNode } = node;
    if (!parentNode || parentNode.type !== Syntax.Program) {
      return false;
    }

    if (node.type !== Syntax.VariableDeclaration) {
      return false;
    }

    const { declarations } = node;
    const extractableDeclarations = [];

    declarations.forEach(declaration => {
      const { id, init } = declaration;

      if (id.type !== Syntax.Identifier) {
        return;
      }

      const pathNode = extractRequirePathNode(init);

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

    this.rewriteRequireAsImports(
      'default-import',
      node,
      extractableDeclarations.map(
        ({ id, pathNode }) => ({
          bindings: [new Binding(id.name, 'default')],
          pathNode
        })
      )
    );

    splice(
      node.parentNode.body, node,
      ...extractableDeclarations.map(({ id, pathNode }) => ({
        type: Syntax.ImportDeclaration,
        specifiers: [{
          type: Syntax.ImportDefaultSpecifier,
          local: id
        }],
        source: pathNode
      }))
    );

    return true;
  }

  /**
   * @private
   */
  rewriteNamedExportRequire(node: Object): boolean {
    const { parentNode } = node;
    if (!parentNode || parentNode.type !== Syntax.Program) {
      return false;
    }

    const declaration = extractSingleDeclaration(node);

    if (!declaration) {
      return false;
    }

    const { id, init } = declaration;

    if (!init || init.type !== Syntax.MemberExpression || init.computed) {
      return false;
    }

    const pathNode = extractRequirePathNode(init.object);

    if (!pathNode) {
      return false;
    }

    this.rewriteRequireAsImport(
      'named-import',
      node,
      [new Binding(id.name, init.property.name)],
      pathNode
    );

    splice(
      node.parentNode.body, node,
      {
        type: Syntax.ImportDeclaration,
        specifiers: [{
          type: Syntax.ImportSpecifier,
          local: id,
          imported: init.property
        }],
        source: pathNode
      }
    );

    return true;
  }

  /**
   * @private
   */
  rewriteDeconstructedImportRequire(node: Object): boolean {
    const { parentNode } = node;
    if (!parentNode || parentNode.type !== Syntax.Program) {
      return false;
    }

    const declaration = extractSingleDeclaration(node);

    if (!declaration) {
      return false;
    }

    const { id, init } = declaration;

    if (id.type !== Syntax.ObjectPattern) {
      return false;
    }

    const bindings = [];

    for (let { key, value } of id.properties) {
      if (value.type !== Syntax.Identifier) {
        return false;
      }
      bindings.push(new Binding(value.name, key.name));
    }

    const pathNode = extractRequirePathNode(init);

    if (!pathNode) {
      return false;
    }

    this.rewriteRequireAsImport('named-import', node, bindings, pathNode);

    splice(
      node.parentNode.body, node,
      {
        type: Syntax.ImportDeclaration,
        specifiers: bindings.map(binding => ({
          type: Syntax.ImportSpecifier,
          local: {
            type: Syntax.Identifier,
            name: binding.localName
          },
          imported: {
            type: Syntax.Identifier,
            name: binding.exportName
          }
        })),
        source: pathNode
      }
    );

    return true;
  }

  /**
   * @private
   */
  rewriteSideEffectRequire(node: Object): boolean {
    const { parentNode } = node;
    if (!parentNode || parentNode.type !== Syntax.Program) {
      return false;
    }

    if (node.type !== Syntax.ExpressionStatement) {
      return false;
    }

    const pathNode = extractRequirePathNode(node.expression);

    if (!pathNode) {
      return false;
    }

    this.rewriteRequireAsImport('bare-import', node, [], pathNode);

    splice(
      node.parentNode.body, node,
      {
        type: Syntax.ImportDeclaration,
        specifiers: [],
        source: pathNode
      }
    );

    return true;
  }

  /**
   * @private
   */
  warnAboutUnsupportedRequire(node: Object): boolean {
    const pathNode = extractRequirePathNode(node);

    if (!pathNode) {
      return false;
    }

    this.module.warn(
      node,
      'unsupported-import',
      `Unsupported 'require' call cannot be transformed to an import`
    );

    return true;
  }

  /**
   * @private
   */
  rewriteRequireAsImport(type: string, node: Object, bindings: Array<Binding>, pathNode: Object) {
    this.rewriteRequireAsImports(
      type,
      node,
      [{ bindings, pathNode }]
    );
  }

  /**
   * @private
   */
  rewriteRequireAsImports(type: string, node: Object, imports: Array<{ bindings: Array<Binding>, pathNode: Object }>) {
    let importStatements = [];
    imports.forEach(({ bindings, pathNode }) => {
      this.metadata.imports.push({
        type,
        node: clone(node),
        bindings,
        path: pathNode.value
      });

      const pathString = this.slice(...pathNode.range);
      if (bindings.length === 0) {
        importStatements.push(`import ${pathString};`);
      } else {
        importStatements.push(`import ${ImportSpecifierListStringBuilder.build(bindings)} from ${pathString};`);
      }
    });
    this.overwrite(
      node.range[0],
      node.range[1],
      importStatements.join('\n')
    );
  }

  /**
   * @private
   */
  rewriteExport(node: Object): boolean {
    return (
      this.rewriteNamespaceExport(node) ||
      this.rewriteNamedExport(node) ||
      this.rewriteSingleExportAsDefaultExport(node)
    );
  }

  /**
   * @private
   */
  rewriteNamespaceExport(node: Object): boolean {
    const right = extractModuleExportsSet(node);

    if (!right) {
      return false;
    }

    const pathNode = extractRequirePathNode(right);

    if (!pathNode) {
      return false;
    }

    this.overwrite(
      ...node.expression.range,
      `export * from ${this.slice(...pathNode.range)}`
    );

    this.metadata.exports.push({
      type: 'namespace-export',
      bindings: [],
      node: clone(node)
    });

    replace(
      node,
      {
        type: Syntax.ExportAllDeclaration,
        source: pathNode
      }
    );
  }

  /**
   * @private
   */
  rewriteNamedExport(node: Object): boolean {
    if (node.type !== Syntax.ExpressionStatement) {
      return false;
    }

    const { expression } = node;

    if (expression.type !== Syntax.AssignmentExpression) {
      return false;
    }

    const { left, right } = expression;

    if (!isMemberExpression(left, /^((module\.)?exports|this)\.\w+$/) || left.computed) {
      return false;
    }

    if (node.parentNode.type !== Syntax.Program) {
      this.module.warn(
        node,
        'unsupported-export',
        `Unsupported export cannot be turned into an 'export' statement`
      );
      return false;
    }

    if (right.type === Syntax.FunctionExpression) {
      return this.rewriteNamedFunctionExpressionExport(node);
    } else if (right.type === Syntax.Identifier) {
      return this.rewriteNamedIdentifierExport(node);
    } else {
      return this.rewriteNamedValueExport(node);
    }
  }

  /**
   * @private
   */
  rewriteNamedFunctionExpressionExport(node: Object): boolean {
    let {
      expression: {
        left: {
          property: { name: exportName }
        },
        right,
        right: { id }
      }
    } = node;

    let { moduleScope } = this.module;
    let fnBinding = id ? id.name : null;
    let localName = claim(moduleScope, fnBinding || exportName);

    this.metadata.exports.push({
      type: 'named-export',
      bindings: [
        {
          exportName,
          localName
        }
      ],
      node: clone(node)
    });

    let isFunctionDeclaration = true;

    if (localName === exportName) {
      // `exports.foo = function foo() {}` → `export function foo() {}`
      //  ^^^^^^^^^^^^^^                      ^^^^^^^
      this.overwrite(node.range[0], right.range[0], 'export ');
      if (!id) {
        this.insert(right.range[0] + 'function'.length, ` ${localName}`);
        right.id = { type: Syntax.Identifier, name: exportName };
      }
      right.type = Syntax.FunctionDeclaration;
      right.expression = false;
      right.id = {
        type: Syntax.Identifier,
        name: exportName
      };
      delete right.range;
      splice(
        node.parentNode.body, node,
        {
          type: Syntax.ExportNamedDeclaration,
          source: null,
          specifiers: [],
          declaration: right
        }
      );
    } else {
      let declaration = right;
      if (!id) {
        this.remove(node.range[0], right.range[0]);
        this.insert(right.range[0] + 'function'.length, ` ${localName}`);
        right.type = Syntax.FunctionDeclaration;
        right.id = { type: Syntax.Identifier, name: localName };
      } else if (fnBinding === localName) {
        right.type = Syntax.FunctionDeclaration;
        this.remove(node.range[0], right.range[0]);
      } else {
        isFunctionDeclaration = false;
        this.overwrite(node.range[0], right.range[0], `let ${localName} = `);
        declaration = {
          type: Syntax.VariableDeclaration,
          kind: 'let',
          declarations: [
            {
              type: Syntax.VariableDeclarator,
              id: {
                type: Syntax.Identifier,
                name: localName
              },
              init: right
            }
          ]
        };
      }
      this.insert(node.range[1], `\nexport { ${localName} as ${exportName} };`);
      splice(
        node.parentNode.body, node,
        declaration,
        {
          type: Syntax.ExportNamedDeclaration,
          source: null,
          specifiers: [
            {
              type: Syntax.ExportSpecifier,
              exported: {
                type: Syntax.Identifier,
                name: exportName
              },
              local: {
                type: Syntax.Identifier,
                name: localName
              }
            }
          ],
          declaration: null
        }
      );
    }

    if (isFunctionDeclaration) {
      const lastCharacterPosition = node.range[1] - 1;
      if (this.charAt(lastCharacterPosition) === ';') {
        this.remove(lastCharacterPosition, node.range[1]);
      }
    }

    return true;
  }

  /**
   * @private
   */
  rewriteNamedIdentifierExport(node: Object): boolean {
    let {
      expression: {
        left: { property },
        right
      }
    } = node;

    let replacements;
    let localBinding;

    if (isDeclaredName(this.module.moduleScope, right.name)) {
      localBinding = right.name;
      if (right.name === property.name) {
        this.overwrite(node.range[0], node.range[1], `export { ${right.name} };`);
      } else {
        this.overwrite(node.range[0], node.range[1], `export { ${right.name} as ${property.name} };`);
      }
      replacements = [
        {
          type: Syntax.ExportNamedDeclaration,
          source: null,
          declaration: null,
          specifiers: [
            {
              type: Syntax.ExportSpecifier,
              local: right,
              exported: property
            }
          ]
        }
      ];
    } else {
      localBinding = claim(this.module.moduleScope, property.name);
      if (localBinding === property.name) {
        this.overwrite(node.range[0], right.range[0], `export let ${localBinding} = `);
        replacements = [
          {
            type: Syntax.ExportNamedDeclaration,
            source: null,
            specifiers: [],
            declaration: {
              type: Syntax.VariableDeclaration,
              kind: 'let',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.Identifier,
                    name: localBinding
                  },
                  init: right
                }
              ]
            }
          }
        ];
      } else {
        this.overwrite(node.range[0], right.range[0], `let ${localBinding} = `);
        this.insert(node.range[1], `\nexport { ${localBinding} as ${property.name} };`);
        replacements = [
          {
            type: Syntax.VariableDeclaration,
            kind: 'let',
            declarations: [
              {
                type: Syntax.VariableDeclarator,
                id: {
                  type: Syntax.Identifier,
                  name: localBinding
                },
                init: right
              }
            ]
          },
          {
            type: Syntax.ExportNamedDeclaration,
            source: null,
            declaration: null,
            specifiers: [
              {
                type: Syntax.ExportSpecifier,
                exported: property,
                local: {
                  type: Syntax.Identifier,
                  name: localBinding
                }
              }
            ]
          }
        ];
      }
    }

    this.metadata.exports.push({
      type: 'named-export',
      bindings: [
        {
          exportName: property.name,
          localName: localBinding
        }
      ],
      node: clone(node)
    });

    splice(node.parentNode.body, node, ...replacements);

    return true;
  }

  /**
   * @private
   */
  rewriteNamedValueExport(node: Object): boolean {
    let {
      expression: {
        left: { property },
        right
      }
    } = node;

    let localBinding = claim(this.module.moduleScope, property.name);
    if (localBinding === property.name) {
      // `exports.foo = 99;` → `export let foo = 99;`
      //  ^^^^^^^^              ^^^^^^^^^^^
      this.overwrite(node.range[0], property.range[0], 'export let ');

      splice(
        node.parentNode.body, node,
        {
          type: Syntax.ExportNamedDeclaration,
          source: null,
          specifiers: [],
          declaration: {
            type: Syntax.VariableDeclaration,
            kind: 'let',
            declarations: [
              {
                type: Syntax.VariableDeclarator,
                id: {
                  type: Syntax.Identifier,
                  name: property.name
                },
                init: right
              }
            ]
          }
        }
      );
    } else {
      // `exports.foo = 99;` → `let foo$1 = 99;`
      //  ^^^^^^^^^^^^^^        ^^^^^^^^^^^^
      this.overwrite(node.range[0], right.range[0], `let ${localBinding} = `);
      let nodeIndex = node.parentNode.body.indexOf(node);
      if (nodeIndex < 0) {
        throw new Error(`could not locate ${node.type} at ${node.line}:${node.column} in its parent block`);
      }
      let nextStatement = node.parentNode.body[nodeIndex + 1];
      // `export { foo$1 as foo };`
      let exportStatement = `export { ${localBinding} as ${property.name} };`;
      if (nextStatement) {
        // Insert before the next statement…
        this.insert(nextStatement.range[0], `${exportStatement}\n`);
      } else {
        // …or after the last one of the program.
        this.insert(node.range[1], `\n${exportStatement}`);
      }
      splice(
        node.parentNode.body, node,
        {
          type: Syntax.VariableDeclaration,
          kind: 'let',
          declarations: [
            {
              type: Syntax.VariableDeclarator,
              id: {
                type: Syntax.Identifier,
                name: localBinding
              },
              init: right
            }
          ]
        },
        {
          type: Syntax.ExportNamedDeclaration,
          source: null,
          declaration: null,
          specifiers: [
            {
              type: Syntax.ExportSpecifier,
              exported: {
                type: Syntax.Identifier,
                name: property.name
              },
              local: {
                type: Syntax.Identifier,
                name: localBinding
              }
            }
          ]
        }
      );
    }

    this.metadata.exports.push({
      type: 'named-export',
      bindings: [
        {
          exportName: property.name,
          localName: localBinding
        }
      ],
      node: clone(node)
    });

    return true;
  }

  /**
   * @private
   */
  rewriteSingleExportAsDefaultExport(node: Object): boolean {
    const right = extractModuleExportsSet(node);

    if (right === null) {
      return false;
    }

    if (right.type === Syntax.ObjectExpression) {
      const bindings = [];
      for (let { key, value } of right.properties) {
        bindings.push(new Binding(value.name, key.name));
      }
      this.metadata.exports.push({
        type: 'named-export',
        bindings,
        node: clone(node)
      });
      this.overwrite(node.range[0], node.range[1], `export ${ExportSpecifierListStringBuilder.build(bindings)};`);

      splice(
        node.parentNode.body, node,
        {
          type: Syntax.ExportNamedDeclaration,
          source: null,
          declaration: null,
          specifiers: bindings.map(binding => ({
            type: Syntax.ExportSpecifier,
            local: {
              type: Syntax.Identifier,
              name: binding.localName
            },
            exported: {
              type: Syntax.Identifier,
              name: binding.exportName
            }
          }))
        }
      );
    } else {
      this.metadata.exports.push({ type: 'default-export', node: clone(node) });
      this.overwrite(node.range[0], right.range[0], 'export default ');

      splice(
        node.parentNode.body, node,
        {
          type: Syntax.ExportDefaultDeclaration,
          declaration: right
        }
      );
    }

    return true;
  }

  /**
   * @private
   */
  removeUseStrictDirective(node: Object): boolean {
    if (node.type !== Syntax.ExpressionStatement) {
      return false;
    }

    const { expression } = node;

    if (expression.type !== Syntax.Literal) {
      return false;
    }

    if (expression.value !== 'use strict') {
      return false;
    }

    if (node.parentNode.body[0] !== node) {
      return false;
    }

    let [ start, end ] = node.range;

    if ((start === 0 || this.charAt(start - '\n'.length) === '\n') && this.charAt(end) === '\n') {
      end += '\n'.length;
    }

    this.metadata.directives.push({
      type: 'removed-strict-mode',
      node
    });

    node.parentNode.body.splice(0, 1);

    this.remove(start, end);
    return true;
  }
}

export function begin(module: Module): Context {
  return new Context(module);
}

export function enter(node: Object, module: Module, context: Context): ?VisitorOption {
  if (/Function/.test(node.type) || context.rewrite(node)) {
    return VisitorOption.Skip;
  }
}

function extractSingleDeclaration(node: Object): ?Object {
  if (node.type !== Syntax.VariableDeclaration) {
    return null;
  }

  if (node.declarations.length !== 1) {
    return null;
  }

  return node.declarations[0];
}

function extractRequirePathNode(node: Object): ?Object {
  if (!node || node.type !== Syntax.CallExpression) {
    return null;
  }

  if (node.callee.type !== Syntax.Identifier || node.callee.name !== 'require') {
    return null;
  }

  if (node.arguments.length !== 1) {
    return null;
  }

  const arg = node.arguments[0];

  if (arg.type !== Syntax.Literal || typeof arg.value !== 'string') {
    return null;
  }

  return arg;
}

/**
 * @private
 */
function extractModuleExportsSet(node: Object): ?Object {
  if (node.type !== Syntax.ExpressionStatement) {
    return null;
  }

  const { expression } = node;

  if (expression.type !== Syntax.AssignmentExpression) {
    return null;
  }

  const { left, right } = expression;

  if (left.type !== Syntax.MemberExpression || left.computed) {
    return null;
  }

  const { object, property } = left;

  if (object.type !== Syntax.Identifier || object.name !== 'module') {
    return null;
  }

  if (property.type !== Syntax.Identifier || property.name !== 'exports') {
    return null;
  }

  return right;
}

/**
 * @private
 */
function extractModuleIIFE(node: Object): ?Object {
  if (node.type !== Syntax.Program) {
    return null;
  }

  if (node.body.length !== 1) {
    return null;
  }

  const [ statement ] = node.body;

  if (statement.type !== Syntax.ExpressionStatement) {
    return null;
  }

  const { expression } = statement;

  let call = expression;

  if (call.type === Syntax.UnaryExpression && call.operator === 'void') {
    // e.g. `void function(){}();`
    call = call.argument;
  }

  if (call.type !== Syntax.CallExpression) {
    return null;
  }

  const { callee, arguments: args } = call;

  let iife;

  if (callee.type === Syntax.FunctionExpression) {
    // e.g. `(function() {})();`
    if (args.length !== 0) {
      return null;
    }

    iife = callee;
  } else if (callee.type === Syntax.MemberExpression) {
    // e.g. `(function() {}).call(this);`
    const { object, property, computed } = callee;

    if (computed || object.type !== Syntax.FunctionExpression) {
      return null;
    }

    if (property.type !== Syntax.Identifier || property.name !== 'call') {
      return null;
    }

    if (args.length !== 1 || args[0].type !== Syntax.ThisExpression) {
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
