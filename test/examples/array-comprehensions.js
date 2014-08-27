/* jshint esnext:true */
/* esnext arrayComprehensions:true */

var squared = [for (x of [1, 2, 3]) x * x];
assert.deepEqual(squared, [1, 4, 9]);
