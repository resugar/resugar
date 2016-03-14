import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse';
import hasParens from '../utils/hasParens';
import needsParens from '../utils/needsParens';
import replace from '../utils/replace';
import type Module from '../module';
import type { ScopeManager } from 'escope';

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

  rewrite(node: Object): boolean {
    return (
      this.rewriteFunctionExpression(node) ||
      this.rewriteCallExpression(node)
    );
  }

  rewriteFunctionExpression(node: Object): boolean {
    if (node.type !== Syntax.FunctionExpression) {
      return false;
    }

    if (node.generator) {
      return false;
    }

    if (node.id) {
      return false;
    }

    if (node.body.body.length !== 1) {
      return false;
    }

    const { parentNode } = node;

    if (parentNode.type === Syntax.Property && parentNode.method) {
      return false;
    }

    if (parentNode.type === Syntax.MethodDefinition && parentNode.value === node) {
      return false;
    }

    const [ statement ] = node.body.body;

    if (statement.type !== Syntax.ReturnStatement || !statement.argument) {
      return false;
    }

    if (referencesThisOrArguments(node, this.module.scopeManager)) {
      return false;
    }

    this._rewriteBlocklessArrowFunction(node);

    if (parentNode.type === Syntax.ExpressionStatement && hasParens(node, this.module)) {
      const { start, end } = this.module.tokenRangeForNode(node);
      const { tokens } = this.module;
      const lparen = tokens[start - 1];
      const rparen = tokens[end];
      this.remove(lparen.range[0], node.range[0]);
      this.remove(node.range[1], rparen.range[1]);
    }

    return true;
  }

  rewriteCallExpression(node: Object): boolean {
    if (node.type !== Syntax.CallExpression) {
      return false;
    }

    const { callee } = node;

    if (callee.type !== Syntax.MemberExpression) {
      return false;
    }

    const { object, property } = callee;

    if (object.type !== Syntax.FunctionExpression || object.id) {
      return false;
    }

    if (property.type !== Syntax.Identifier || property.name !== 'bind') {
      return false;
    }

    if (node.arguments.length !== 1 || node.arguments[0].type !== Syntax.ThisExpression) {
      return false;
    }

    if (referencesArguments(object, this.module.scopeManager)) {
      return false;
    }

    this._rewriteBlockArrowFunction(object);

    // `() => {}.bind(this)` -> `() => {}bind(this)`
    //          ^
    this.module.tokensBetweenNodes(object, property).forEach(token => {
      if (token.type === 'Punctuator' && token.value === '.') {
        this.remove(...token.range);
      }
    });

    // `() => {}bind(this)` -> `() => {}`
    //          ^^^^^^^^^^
    this.remove(property.range[0], node.range[1]);

    replace(node, object);

    return true;
  }

  _rewriteBlocklessArrowFunction(node: Object) {
    const [ statement ] = node.body.body;

    this.metadata.functions.push(clone(node));

    const tokens = this.module.tokensForNode(node);
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

    const paramsNeedsParens = node.params.length !== 1 || node.params[0].type !== Syntax.Identifier;

    if (!paramsNeedsParens) {
      // `(a)` -> `a`
      //  ^ ^
      this.remove(...paramStartParenToken.range);
      this.remove(...paramEndParenToken.range);
    }

    const blockStartBraceToken = tokens[tokenIndex++];
    const blockEndBraceToken = tokens[tokens.length - 1];

    // `function() {` -> `() =>`
    //  ^^^^^^^^   ^         ^^
    this.remove(functionToken.range[0], paramStartParenToken.range[0]);
    this.overwrite(...blockStartBraceToken.range, '=>');

    const contentBetweenBlockStartBraceAndReturn = this.slice(
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
      this.overwrite(blockStartBraceToken.range[1], statement.range[0], ' ');
      this.remove(statement.range[1], blockEndBraceToken.range[0]);
    }

    // `return foo;` -> `foo`
    //  ^^^^^^^   ^
    this.remove(statement.range[0], statement.argument.range[0]);
    this.remove(statement.argument.range[1], statement.range[1]);

    // `…}` -> `…`
    this.remove(...blockEndBraceToken.range);

    node.type = Syntax.ArrowFunctionExpression;
    node.body = statement.argument;

    if (needsParens(node) && !hasParens(node, this.module)) {
      this.insert(node.range[0], '(');
      this.insert(node.range[1], ')');
    }

    if (node.body.type === 'ObjectExpression') {
      this.insert(node.body.range[0], '(');
      this.insert(node.body.range[1], ')');
    }
  }

  _rewriteBlockArrowFunction(node: Object) {
    this.metadata.functions.push(clone(node));

    const tokens = this.module.tokensForNode(node);
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

    const paramsNeedsParens = node.params.length !== 1 || node.params[0].type !== Syntax.Identifier;

    if (!paramsNeedsParens) {
      // `(a)` -> `a`
      //  ^ ^
      this.remove(...paramStartParenToken.range);
      this.remove(...paramEndParenToken.range);
    }

    const blockStartBraceToken = tokens[tokenIndex++];

    // `function() {` -> `() =>`
    //  ^^^^^^^^   ^         ^^
    this.remove(functionToken.range[0], paramStartParenToken.range[0]);
    this.insert(blockStartBraceToken.range[0], '=> ');

    node.type = Syntax.ArrowFunctionExpression;
  }
}

export function begin(module: Module): Context {
  return new Context(module);
}

export function enter(node: Object, module: Module, context: Context): ?VisitorOption {
  context.rewrite(node);
  return null;
}

function referencesThisOrArguments(node: Object, scopeManager: ScopeManager): boolean {
  const scope = scopeManager.acquire(node);

  if (scope.thisFound) {
    return true;
  }

  return referencesArguments(node, scopeManager);
}

function referencesArguments(node: Object, scopeManager: ScopeManager): boolean {
  const scope = scopeManager.acquire(node);
  return scope.references.some(({ identifier }) => identifier.name === 'arguments');
}
