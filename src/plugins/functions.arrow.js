import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse';
import type Module from '../module';

const { Syntax, VisitorOption } = estraverse;

export const name = 'functions.arrow';
export const description = 'Transform regular functions to arrow functions as appropriate.';

export function begin(module: Module): Context {
  return new Context(module);
}

export function enter(node: Object, parent: Object, module: Module, context: Context): ?VisitorOption {
  if (node.type !== Syntax.FunctionExpression) {
    return null;
  }

  if (node.id) {
    return null;
  }

  if (node.body.body.length !== 1) {
    return null;
  }

  const [ statement ] = node.body.body;

  if (statement.type !== Syntax.ReturnStatement) {
    return null;
  }

  if (referencesThis(statement.argument)) {
    return null;
  }

  context.metadata.functions.push(clone(node));

  const magicString = module.magicString;

  if (node.params.length === 0) {
    magicString.overwrite(
      node.range[0],
      statement.argument.range[0],
      '() => '
    );
  } else {
    const firstParam = node.params[0];
    const lastParam = node.params[node.params.length - 1];
    const needsParens = firstParam !== lastParam;

    magicString.overwrite(
      node.range[0],
      firstParam.range[0],
      needsParens ? '(' : ''
    );
    magicString.overwrite(
      lastParam.range[1],
      statement.argument.range[0],
      needsParens ? ') => ' : ' => '
    );
  }

  magicString.remove(
    statement.argument.range[1],
    node.range[1]
  );

  node.type = Syntax.ArrowFunctionExpression;
  node.body = statement.argument;
}

class Context extends BaseContext {
  constructor(module: Module) {
    super(name, module);
    module.metadata[name] = {
      functions: []
    };
  }

  get metadata() {
    if (!this.module.metadata[name]) {
      this.module.metadata[name] = {};
    }
    return this.module.metadata[name];
  }
}

function referencesThis(node: Object): boolean {
  let result = false;

  estraverse.traverse(node, {
    enter(child: Object): ?VisitorOption {
      switch (child.type) {
        case Syntax.ThisExpression:
          result = true;
          return VisitorOption.Break;

        case Syntax.FunctionExpression:
        case Syntax.FunctionDeclaration:
          return VisitorOption.Skip;

        default:
          return null;
      }
    }
  });

  return result;
}
