import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse';
import type Module from '../module';

const { Syntax, VisitorOption } = estraverse;

export const name = 'functions.arrow';
export const description = 'Transform regular functions to arrow functions as appropriate.';

class Context extends BaseContext {
  constructor(module: Module) {
    super(name, module);
    module.metadata[name] = {
      functions: []
    };
  }
}

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

  const tokens = module.tokensForNode(node);
  let tokenIndex = 0;
  const functionToken = tokens[tokenIndex++];
  const paramStartParenToken = tokens[tokenIndex++];
  let paramEndParenToken;

  if (node.params.length === 0) {
    paramEndParenToken = tokens[tokenIndex++];
  } else {
    const lastParam = node.params[node.params.length - 1];
    while (tokenIndex < tokens.length) {
      const token = tokens[tokenIndex++];
      if (token.range[0] >= lastParam.range[1] && token.value === ')') {
        paramEndParenToken = token;
        break;
      }
    }
  }

  const paramsNeedsParens = node.params.length !== 1 || node.params[0].type !== 'Identifier';

  if (!paramsNeedsParens) {
    // `(a)` -> `a`
    //  ^ ^
    context.remove(...paramStartParenToken.range);
    context.remove(...paramEndParenToken.range);
  }

  const blockStartBraceToken = tokens[tokenIndex++];
  const blockEndBraceToken = tokens[tokens.length - 1];

  // `function() {` -> `() =>`
  //  ^^^^^^^^   ^         ^^
  context.remove(functionToken.range[0], paramStartParenToken.range[0]);
  context.overwrite(...blockStartBraceToken.range, '=>');

  const contentBetweenBlockStartBraceAndReturn = context.slice(
    blockStartBraceToken.range[1],
    statement.range[0]
  );

  const shouldCollapseToOneLine = /^\s*$/.test(contentBetweenBlockStartBraceAndReturn);

  if (shouldCollapseToOneLine) {
    // Removes whitespace between `{` and `return` and `foo;` and `}`.
    //
    //  function() {
    //    return foo;
    //  }
    //
    context.overwrite(blockStartBraceToken.range[1], statement.range[0], ' ');
    context.remove(statement.range[1], blockEndBraceToken.range[0]);
  }

  // `return foo;` -> `foo`
  //  ^^^^^^^   ^
  context.remove(statement.range[0], statement.argument.range[0]);
  context.remove(statement.argument.range[1], statement.range[1]);

  // `…}` -> `…`
  context.remove(...blockEndBraceToken.range);

  node.type = Syntax.ArrowFunctionExpression;
  node.body = statement.argument;
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
