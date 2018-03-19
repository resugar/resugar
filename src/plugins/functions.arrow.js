import * as t from '@babel/types';
import cleanNode from '../utils/cleanNode.js';
import replace from '../utils/replace';
import type Module from '../module';
import type { Node, Path, Token, Visitor } from '../types';
import { hasParens } from '../utils/hasParens';
import { needsParens } from '../utils/needsParens';
import { findToken, findEndBraceTokenBalanced, findEndParenthesisTokenBalanced } from '../utils/findTokens';

export const name = 'functions.arrow';
export const description = 'Transform regular functions to arrow functions as appropriate.';

export function visitor(module: Module): Visitor {
  let editor = module.magicString;
  let functions = metadata(module).functions;

  return {
    FunctionExpression(path) {
      let { node, parent } = path;

      // Skip generator functions.
      if (node.generator) {
        return;
      }

      // Only process anonymous functions.
      if (node.id) {
        return;
      }

      // Skip object literal methods.
      if (t.isProperty(parent) && parent.method) {
        return;
      }

      // Skip class methods.
      if (t.isClassMethod(parent) && parent.value === node) {
        return;
      }

      // Only process functions with a single return statement.
      if (node.body.body.length !== 1) {
        return;
      }

      // A directive like "use strict" is syntactically its own line, so if any
      // exist, we can't assume this is a single-line function.
      if (node.body.directives.length > 0) {
        return;
      }

      // `new` can't be called on arrow functions.
      if (t.isNewExpression(parent)) {
        return;
      }

      let [ statement ] = node.body.body;

      if (!t.isReturnStatement(statement) || !statement.argument) {
        return;
      }

      // Skip functions referencing `this` or `arguments`.
      if (referencesThisOrArguments(path)) {
        return;
      }

      rewriteBlocklessArrowFunction(path, module, functions);

      // Remove extra parentheses if they're no longer needed.
      if (t.isExpressionStatement(parent) && hasParens(path, module)) {
        let { start, end } = module.tokenIndexRangeForSourceRange(node.start, node.end);
        let { tokens } = module;
        let lparen = tokens[start - 1];
        let rparen = tokens[end];
        editor.remove(lparen.start, node.start);
        editor.remove(node.end, rparen.end);
      }
    },

    /**
     * Look for functions that are manually bound, e.g.
     *
     *   this.onclick = (function() {
     *     console.log('registering');
     *     this.register();
     *   }).bind(this);
     */
    CallExpression(path) {
      let { node, node: { callee }, parent } = path;

      if (!t.isMemberExpression(callee)) {
        return;
      }

      let { object, property } = callee;

      if (!t.isFunctionExpression(object) || object.id) {
        return;
      }

      if (!t.isIdentifier(property) || property.name !== 'bind') {
        return;
      }

      if (node.arguments.length !== 1 || !t.isThisExpression(node.arguments[0])) {
        return;
      }

      let objectPath = path.get('callee').get('object');

      if (referencesArguments(objectPath)) {
        return;
      }

      if (objectPath.node.generator) {
        return;
      }

      // `new` can't be called on arrow functions.
      if (t.isNewExpression(parent)) {
        path.skip();
        return;
      }

      rewriteBlockArrowFunction(objectPath, module, functions);

      // `() => {}.bind(this)` -> `() => {}bind(this)`
      //          ^
      let { start, end } = module.tokenIndexRangeForSourceRange(object.end, property.start);
      let tokens = module.tokens;

      for (let i = start; i < end; i++) {
        let token = tokens[i];
        if (token.type.label === '.') {
          editor.remove(token.start, token.end);
        }
      }

      // `() => {}bind(this)` -> `() => {}`
      //          ^^^^^^^^^^
      editor.remove(property.start, node.end);

      replace(node, object);
    }
  };
}

function referencesThisOrArguments(path: Path): boolean {
  let result = false;

  path.scope.traverse(path.node, {
    'FunctionDeclaration|FunctionExpression'(fnPath) {
      // Skip nested functions.
      fnPath.skip();
    },

    ThisExpression(thisPath) {
      result = true;
      thisPath.stop();
    },

    Identifier(identPath) {
      if (identPath.node.name === 'arguments') {
        result = true;
        identPath.stop();
      }
    }
  });

  return result;
}

function referencesArguments(path: Path): boolean {
  let result = false;

  path.scope.traverse(path.node, {
    Function(fnPath: Path) {
      // Skip nested functions.
      fnPath.skip();
    },

    Identifier(identPath: Path) {
      if (identPath.node.name === 'arguments') {
        result = true;
        identPath.stop();
      }
    }
  });

  return result;
}

function metadata(module: Module): { functions: Array<Node> } {
  if (!module.metadata[name]) {
    module.metadata[name] = { functions: [] };
  }
  return module.metadata[name];
}

function rewriteBlocklessArrowFunction(path: Path, module: Module, functions: Array<Node>) {
  let { node } = path;
  let [ statement ] = node.body.body;

  functions.push(cleanNode(node));

  let {
    fn,
    paramsStart,
    paramsEnd,
    blockStart,
    blockEnd
  } = getFunctionPunctuation(node, module);

  // Only remove parens for a single simple parameter on the same line as the `=>`.
  let paramsNeedParens = node.params.length !== 1 ||
    !t.isIdentifier(node.params[0]) ||
    node.params[0].loc.end.line !== paramsEnd.loc.start.line;

  let editor = module.magicString;
  if (!paramsNeedParens) {
    // `(a)` -> `a`
    //  ^ ^
    editor.remove(paramsStart.start, paramsStart.end);
    editor.remove(paramsEnd.start, paramsEnd.end);
  }

  // `function() {` -> `() =>`
  editor.remove(fn.start, paramsStart.start);
  editor.overwrite(blockStart.start, blockStart.end, '=>');

  let contentBetweenBlockStartBraceAndReturn = module.source.slice(
    blockStart.end,
    statement.start
  );
  let contentOfReturnArgument = module.sourceOf(statement.argument);

  let shouldCollapseToOneLine = (
    // Wouldn't remove anything interesting.
    /^\s*$/.test(contentBetweenBlockStartBraceAndReturn) &&
    // Returned value isn't multi-line.
    /^[^\n\r]*$/.test(contentOfReturnArgument)
  );

  if (shouldCollapseToOneLine) {
    // Removes whitespace between `{` and `return` and `foo;` and `}`.
    //
    //  function() {
    //    return foo;
    //  }
    //
    if (blockStart.end === statement.start) {
      editor.appendLeft(statement.start, ' ');
    } else {
      editor.overwrite(blockStart.end, statement.start, ' ');
    }
    editor.remove(statement.end, blockEnd.end);
  }

  let returnArgumentNeedsParens = t.isSequenceExpression(statement.argument);

  // `return foo;` -> `foo`
  //  ^^^^^^^   ^
  editor.overwrite(
    statement.start,
    statement.argument.start,
    returnArgumentNeedsParens ? '(' : ''
  );
  if (statement.argument.end === statement.end) {
    editor.appendLeft(
      statement.end,
      returnArgumentNeedsParens ? ')' : ''
    );
  } else {
    editor.overwrite(
      statement.argument.end,
      statement.end,
      returnArgumentNeedsParens ? ')' : ''
    );
  }

  // `…}` -> `…`
  editor.remove(blockEnd.start, blockEnd.end);

  node.type = 'ArrowFunctionExpression';
  node.body = statement.argument;
  node.expression = true;

  if (needsParens(path) && !hasParens(path, module)) {
    editor.appendRight(node.start, '(');
    editor.appendLeft(node.end, ')');
  }

  if (bodyNeedsParens(node.body, module.source)) {
    editor.appendRight(node.body.start, '(');
    editor.appendLeft(node.body.end, ')');
  }
}

/**
 * Rewrites a function expression to an arrow function, preserving the block.
 */
function rewriteBlockArrowFunction(path: Path, module: Module, functions: Array<Node>) {
  let { node } = path;

  functions.push(cleanNode(node));

  let {
    fn,
    paramsStart,
    paramsEnd,
    blockStart
  } = getFunctionPunctuation(node, module);

  let paramsNeedsParens = node.params.length !== 1 || !t.isIdentifier(node.params[0]);
  let editor = module.magicString;

  if (!paramsNeedsParens) {
    // `(a)` -> `a`
    //  ^ ^
    editor.remove(paramsStart.start, paramsStart.end);
    editor.remove(paramsEnd.start, paramsEnd.end);
  }

  // `function() {` -> `() =>`
  //  ^^^^^^^^   ^         ^^
  editor.remove(fn.start, paramsStart.start);
  editor.appendLeft(blockStart.start, '=> ');

  node.type = 'ArrowFunctionExpression';
}

type FunctionPunctuation = {
  fn: Token,
  paramsStart: Token,
  paramsEnd: Token,
  blockStart: Token,
  blockEnd: Token,
};

/**
 * Get the tokens for the relevant function punctuation, i.e.
 *
 *            paramsStart    paramsEnd
 *             fn       |    |
 *              |       |    |
 *              v       v    v
 *   let add = (function(a, b) { <- blockStart
 *     return a + b;
 *   });
 *   ^
 *   |
 *   blockEnd
 */
function getFunctionPunctuation(node: Node, module: Module): FunctionPunctuation {
  let tokens = module.tokensForNode(node);
  let { index: functionTokenIndex, token: fn } = findToken(
    'function',
    tokens,
    0
  );
  let { index: paramsStartIndex, token: paramsStart } = findToken(
    '(',
    tokens,
    functionTokenIndex
  );
  let { index: paramsEndIndex, token: paramsEnd } = findEndParenthesisTokenBalanced(
    tokens,
    paramsStartIndex
  );
  let { index: blockStartIndex, token: blockStart } = findToken(
    '{',
    tokens,
    paramsEndIndex
  );
  let { token: blockEnd } = findEndBraceTokenBalanced(
    tokens,
    blockStartIndex
  );
  return {
    fn,
    paramsStart,
    paramsEnd,
    blockStart,
    blockEnd
  };
}

function bodyNeedsParens(body: Node, source: string) {
  return source[body.start] === '{';
}
