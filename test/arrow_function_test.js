import { checkExample } from './support/check';

describe('Arrow Function plugin', () => {
  it('rewrites functions that are just a return statement as an arrow function', () => {
    checkExample('functions.arrow/single-argument');
  });

  it('rewrites functions with a single return statement with multiple arguments', () => {
    checkExample('functions.arrow/multiple-arguments');
  });

  it('does not rewrite functions that have a name', () => {
    checkExample('functions.arrow/named-function');
  });

  it('does not rewrite functions that reference `this`', () => {
    checkExample('functions.arrow/references-this');
  });

  it('rewrites functions that reference `this` only inside a nested function', () => {
    checkExample('functions.arrow/references-this-nested-function');
  });
});
