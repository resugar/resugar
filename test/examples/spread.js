/* jshint esnext:true */

function sum(...numbers) {
  return numbers.reduce(function(sum, n) { return n + sum; }, 0);
}

assert.equal(sum(4, 5, ...[10, 20, 30]), 69);

assertMap('spread', [7,18], [443,31], 'regular param');
assertMap('spread', [7,28], [443,75], 'spread param');
