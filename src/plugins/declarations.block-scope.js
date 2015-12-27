import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse';
import mostRestrictiveKindForDeclaration from '../utils/mostRestrictiveKindForDeclaration';
import type Module from '../module';

const { Syntax, VisitorOption } = estraverse;

export const name = 'declarations.block-scope';
export const description = 'Transform `var` into `let` and `const` as appropriate.';

class Context extends BaseContext {
  constructor(module: Module) {
    super(name, module);
    module.metadata[name] = {
      declarations: []
    };
  }
}

export function begin(module: Module): Context {
  return new Context(module);
}

export function enter(node: Object, parent: Object, module: Module, context: Context): ?VisitorOption {
  if (node.type !== Syntax.VariableDeclaration) {
    return null;
  }

  if (node.kind !== 'var') {
    return null;
  }

  const { magicString } = module;
  const kind = mostRestrictiveKindForDeclaration(node, module.scopeManager);

  if (kind !== 'var') {
    magicString.overwrite(node.range[0], node.range[0] + 'var'.length, kind);
    context.metadata.declarations.push(clone(node));
  } else {
    module.warn(
      node,
      'unsupported-declaration',
      `'var' declaration cannot be converted to block scope`
    );
  }

  return null;
}
