import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse';
import mostRestrictiveKindForDeclaration from '../utils/mostRestrictiveKindForDeclaration';
import type Module from '../module';

const { Syntax, VisitorOption } = estraverse;

export const name = 'declarations.block-scope';
export const description = 'Transform `var` into `let` and `const` as appropriate.';

export type Options = {
  disableConst: boolean
};

class Context extends BaseContext {
  constructor(module: Module, options: Options={}) {
    super(name, module);
    module.metadata[name] = {
      declarations: []
    };
    this.options = options;
  }

  rewrite(node: Object) {
    this.rewriteVariableDeclaration(node);
  }

  rewriteVariableDeclaration(node: Object): boolean {
    if (node.type !== Syntax.VariableDeclaration) {
      return false;
    }

    if (node.kind !== 'var') {
      return false;
    }

    const kind = mostRestrictiveKindForDeclaration(node, this.module.scopeManager);

    if (kind !== 'var') {
      this.rewriteVariableDeclarationKind(node, kind);
    } else {
      this.module.warn(
        node,
        'unsupported-declaration',
        `'var' declaration cannot be converted to block scope`
      );
    }

    return false;
  }

  rewriteVariableDeclarationKind(node: Object, kind: 'let'|'const') {
    if (kind === 'const' && this.options.disableConst) {
      kind = 'let';
    }
    this.overwrite(node.range[0], node.range[0] + 'var'.length, kind);
    this.metadata.declarations.push(clone(node));
    node.kind = kind;
  }
}

export function begin(module: Module, options: Options={}): Context {
  return new Context(module, options);
}

export function enter(node: Object, module: Module, context: Context): ?VisitorOption {
  context.rewrite(node);
  return null;
}
