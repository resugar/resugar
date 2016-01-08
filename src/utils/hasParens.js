import type Module from '../module';

export default function hasParens(node: Object, module: Module): boolean {
  const { tokens } = module;
  const { start, end } = module.tokenRangeForNode(node);
  const tokenBefore = tokens[start - 1];
  const tokenAfter = tokens[end];
  return (
    tokenBefore.type === 'Punctuator' && tokenBefore.value === '(' &&
    tokenAfter.type === 'Punctuator' && tokenAfter.value === ')'
  );
}
