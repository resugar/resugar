import check, { checkExample } from './support/check';
import { Syntax } from 'estraverse';

describe('Block Scope plugin', () => {
  it('rewrites `var` to `let` when there is no initializer', () => {
    checkExample('declarations.block-scope/var-no-initializer');
  });

  it('rewrites `var` to `const` when there is only an initialization and no reassignments', () => {
    checkExample('declarations.block-scope/var-with-initializer');
  });

  it('converts `var` to `let` when a binding is reassigned using compound assignment', () => {
    checkExample('declarations.block-scope/var-with-reassignment');
  });

  it('converts `var` to `let` when some but not all bindings on the declaration could be `const`', () => {
    checkExample('declarations.block-scope/var-with-mixed-reassignment');
  });

  it('converts destructuring `var` to `const`', () => {
    checkExample('declarations.block-scope/var-destructuring');
  });

  it('warns about `var` when references precede the declaration', () => {
    checkExample('declarations.block-scope/var-hoisting');
  });

  it('leaves duplicate `var`s alone', () => {
    checkExample('declarations.block-scope/var-duplicate');
  });
});
