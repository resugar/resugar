import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import isMemberExpression from '../utils/isMemberExpression';
import replace from '../utils/replace';
import type Module from '../module';
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

  rewrite(node: Object, parent: Object): boolean {
    return (
      this.rewriteRequire(node, parent) ||
      this.rewriteExport(node, parent) ||
      this.removeUseStrictDirective(node, parent)
    );
  }

  /**
   * @private
   */
  rewriteRequire(node: Object, parent: Object): boolean {
    return (
      this.rewriteSingleExportRequire(node, parent) ||
      this.rewriteNamedExportRequire(node, parent) ||
      this.rewriteDeconstructedImportRequire(node, parent) ||
      this.rewriteSideEffectRequire(node, parent) ||
      this.warnAboutUnsupportedRequire(node, parent)
    );
  }

  /**
   * @private
   */
  rewriteSingleExportRequire(node: Object, parent: Object): boolean {
    if (!parent || parent.type !== Syntax.Program) {
      return false;
    }

    const declaration = extractSingleDeclaration(node);

    if (!declaration) {
      return false;
    }

    const { id, init } = declaration;

    if (id.type !== Syntax.Identifier) {
      return false;
    }

    const pathNode = extractRequirePathNode(init);

    if (!pathNode) {
      return false;
    }

    this.rewriteRequireAsImport(
      'default-import',
      node,
      [new Binding(id.name, 'default')],
      pathNode
    );

    replace(node, {
      type: Syntax.ImportDeclaration,
      specifiers: [{
        type: Syntax.ImportDefaultSpecifier,
        local: id
      }],
      source: pathNode
    });

    return true;
  }

  /**
   * @private
   */
  rewriteNamedExportRequire(node: Object, parent: Object): boolean {
    if (!parent || parent.type !== Syntax.Program) {
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

    replace(node, {
      type: Syntax.ImportDeclaration,
      specifiers: [{
        type: Syntax.ImportSpecifier,
        local: id,
        imported: init.property
      }],
      source: pathNode
    });

    return true;
  }

  /**
   * @private
   */
  rewriteDeconstructedImportRequire(node: Object, parent: Object): boolean {
    if (!parent || parent.type !== Syntax.Program) {
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

    replace(node, {
      type: Syntax.ImportDeclaration,
      specifiers: bindings.map(binding => ({
        type: Syntax.ImportBinding,
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
    });

    return true;
  }

  /**
   * @private
   */
  rewriteSideEffectRequire(node: Object, parent: Object): boolean {
    if (!parent || parent.type !== Syntax.Program) {
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
    this.metadata.imports.push({
      type,
      node: clone(node),
      bindings,
      path: pathNode.value
    });

    const pathString = this.slice(...pathNode.range);
    if (bindings.length === 0) {
      this.overwrite(
        node.range[0],
        node.range[1],
        `import ${pathString};`
      );
    } else {
      this.overwrite(
        node.range[0],
        node.range[1],
        `import ${ImportSpecifierListStringBuilder.build(bindings)} from ${pathString};`
      );
    }
  }

  /**
   * @private
   */
  rewriteExport(node: Object, parent: Object): boolean {
    return (
      this.rewriteNamedExport(node, parent) ||
      this.rewriteSingleExportAsDefaultExport(node, parent)
    );
  }

  /**
   * @private
   */
  rewriteNamedExport(node: Object, parent: Object): boolean {
    if (node.type !== Syntax.ExpressionStatement) {
      return false;
    }

    const { expression } = node;

    if (expression.type !== Syntax.AssignmentExpression) {
      return false;
    }

    const { left, right } = expression;

    if (!isMemberExpression(left, /^(module\.)?exports\.\w+$/) || left.computed) {
      return false;
    }

    const { property } = left;

    if (parent.type !== Syntax.Program) {
      this.module.warn(
        node,
        'unsupported-export',
        `Unsupported export cannot be turned into an 'export' statement`
      );
      return false;
    }

    if (right.type === Syntax.FunctionExpression) {
      const exportName = property.name;
      const { id } = right;

      this.metadata.exports.push({
        bindings: [
          {
            exportName,
            localName: id ? id.name : exportName
          }
        ],
        node: clone(node)
      });

      this.overwrite(node.range[0], right.range[0], 'export ');

      if (!id) {
        this.insert(right.range[0] + 'function'.length, ` ${exportName}`);
        right.id = { type: Syntax.Identifier, name: exportName };
      } else if (id.name !== property.name) {
        this.overwrite(id.range[0], id.range[1], property.name);
        this.module.warn(
          clone(id),
          'export-function-name-mismatch',
          `Exported function '${id.name}' does not match export name '${exportName}'`
        );
        id.name = property.name;
      }

      const lastCharacterPosition = node.range[1] - 1;
      if (this.charAt(lastCharacterPosition) === ';') {
        this.remove(lastCharacterPosition, node.range[1]);
      }
    } else if (right.type === Syntax.Identifier) {
      this.metadata.exports.push({
        type: 'named-export',
        bindings: [
          {
            exportName: property.name,
            localName: right.name
          }
        ],
        node: clone(node)
      });

      if (right.name === property.name) {
        this.overwrite(node.range[0], node.range[1], `export { ${right.name} };`);
      } else {
        this.overwrite(node.range[0], node.range[1], `export { ${right.name} as ${property.name} };`);
      }
    } else {
      if (this.module.moduleScope.isUsedName(property.name)) {
        this.module.warn(
          clone(property),
          'named-export-conflicts-with-local-binding',
          `Named export '${property.name}' conflicts with existing local binding`
        );
      }

      this.metadata.exports.push({
        type: 'named-export',
        bindings: [
          {
            exportName: property.name,
            localName: property.name
          }
        ],
        node: clone(node)
      });

      this.overwrite(node.range[0], property.range[0], 'export let ');
    }

    return true;
  }

  /**
   * @private
   */
  rewriteSingleExportAsDefaultExport(node: Object): boolean {
    if (node.type !== Syntax.ExpressionStatement) {
      return false;
    }

    const { expression } = node;

    if (expression.type !== Syntax.AssignmentExpression) {
      return false;
    }

    const { left, right } = expression;

    if (left.type !== Syntax.MemberExpression || left.computed) {
      return false;
    }

    const { object, property } = left;

    if (object.type !== Syntax.Identifier || object.name !== 'module') {
      return false;
    }

    if (property.type !== Syntax.Identifier || property.name !== 'exports') {
      return false;
    }

    if (right.type === 'ObjectExpression') {
      const bindings = [];
      for (let { key, value } of right.properties) {
        bindings.push(new Binding(value.name, key.name));
      }
      this.metadata.exports.push({
        type: 'named-export',
        bindings,
        node
      });
      this.overwrite(node.range[0], node.range[1], `export ${ExportSpecifierListStringBuilder.build(bindings)};`);
    } else {
      this.metadata.exports.push({ type: 'default-export', node });
      this.overwrite(node.range[0], right.range[0], 'export default ');
    }

    return true;
  }

  /**
   * @private
   */
  removeUseStrictDirective(node: Object, parent: Object): boolean {
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

    if (parent.body[0] !== node) {
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

    this.remove(start, end);
    return true;
  }
}

export function begin(module: Module): Context {
  return new Context(module);
}

export function enter(node: Object, parent: Object, module: Module, context: Context): ?VisitorOption {
  if (/Function/.test(node.type) || context.rewrite(node, parent)) {
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
