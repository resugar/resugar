/* jshint esnext:true */

function *range(max, step) {
  var count = 0;
  step = step || 1;

  for (var i = 0; i < max; i += step) {
    count++;
    yield i;
  }

  return count;
}

var gen = range(20, 3), info;
var values = [];

while (!(info = gen.next()).done) {
  values.push(info.value);
}

assert.deepEqual(values, [0, 3, 6, 9, 12, 15, 18]);
assert.equal(info.value, 7);
