import * as t from '@babel/types';
import type { Path } from '../types.js';

export function needsParens(path: Path): boolean {
  let { node, parent } = path;

  if (t.isArrowFunctionExpression(node)) {
    if (t.isMemberExpression(parent)) {
      return parent.object === node;
    } else if (t.isCallExpression(parent)) {
      return parent.callee === node;
    } else if (t.isBinaryExpression(parent)) {
      return true;
    } else if (t.isLogicalExpression(parent)) {
      return true;
    }
  }

  return false;
}
