/* jshint esnext:true */

assert.equal(
  normalize(compile('function* foo(){}', { includeRuntime: true, generator: false })),
  normalize('function* foo(){}')
);
