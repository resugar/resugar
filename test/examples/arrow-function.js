/* jshint esnext:true */

var square = x => x * x;
assert.equal(square(3), 9);

assertMap('arrow-function', [3,14], [436,23], 'fat arrow param');
assertMap('arrow-function', [3,19], [437,10], 'return x * x');
