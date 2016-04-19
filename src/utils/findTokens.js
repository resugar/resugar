import indexOfElementMatchingPredicate from './indexOfElementMatchingPredicate';
import type { IndexedToken, Token } from '../types';

export function findToken(label: string, tokens: Array<Token>, start: number=0): IndexedToken {
  return findTokenMatchingPredicate(
    token => token.type.label === label,
    tokens,
    start
  );
}

export function findTokenMatchingPredicate(predicate: (token: Token) => boolean, tokens: Array<Token>, start: number=0): IndexedToken {
  let index = indexOfElementMatchingPredicate(tokens, predicate, start);
  if (index < 0) {
    let loc = tokens[start].loc.start;
    throw new Error(`unexpected token after ${loc.line}:${loc.column + 1}`);
  }
  return { index, token: tokens[index] };
}

export function findEndBraceTokenBalanced(tokens: Array<Token>, start: number=0): IndexedToken {
  // We count '{' and '${' as left tokens because string interpolations start
  // with '${' and end with the same '}' as objects and blocks.
  return findEndTokenBalanced(['{', '${'], '}', tokens, start);
}

export function findEndParenthesisTokenBalanced(tokens: Array<Token>, start: number=0): IndexedToken {
  return findEndTokenBalanced('(', ')', tokens, start);
}

export function findEndTokenBalanced(left: string | Array<string>, right: string | Array<string>, tokens: Array<Token>, start: number=0): IndexedToken {
  let index = indexOfBalancedToken(
    tokens,
    tokenMatcher(left),
    tokenMatcher(right),
    start
  );
  if (index < 0) {
    let loc = tokens[start].loc.start;
    throw new Error(`expected balanced tokens starting at ${loc.line}:${loc.column + 1}`);
  }
  return { index, token: tokens[index] };
}

function tokenMatcher(label: string | Array<string>): (token: Token) => boolean {
  if (typeof label === 'string') {
    return token => token.type.label === label;
  } else {
    return token => label.indexOf(token.type.label) >= 0;
  }
}

function indexOfBalancedToken(
  tokens: Array<Token>,
  leftPredicate: (token: Token) => boolean,
  rightPredicate: (token: Token) => boolean,
  start: number=0
): number {
  let depth = 0;
  return indexOfElementMatchingPredicate(
    tokens,
    token => {
      if (leftPredicate(token)) {
        depth++;
      }
      if (rightPredicate(token)) {
        depth--;
      }
      return depth === 0;
    },
    start
  );
}
