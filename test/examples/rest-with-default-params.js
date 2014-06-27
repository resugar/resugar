/* jshint esnext:true */

function foo(a=0, ...b) {
  return [a, b];
}

assert.deepEqual(foo(1, 2, 3), [1, [2, 3]]);
assert.deepEqual(foo(undefined, 2, 3), [0, [2, 3]]);

assertMap('rest-with-default-params', [3,14], [437,7], 'default a');
assertMap('rest-with-default-params', [3,22], [438,7], 'rest b');
