import type Module from '../module';
import type { Path } from '../types.js';

export function hasParens(path: Path, module: Module): boolean {
  let { tokens } = module;
  let { start, end } = module.tokenIndexRangeForSourceRange(path.node.start, path.node.end);
  let tokenBefore = tokens[start - 1];
  let tokenAfter = tokens[end];

  return (
    tokenBefore.type.label === '(' &&
    tokenAfter.type.label === ')'
  );
}
