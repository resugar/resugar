/* jshint esnext:true */

var join = function(joinStr, ...items) {
  return items.join(joinStr);
};

assert.equal(join(' & ', 1, 2, 3), '1 & 2 & 3');

assertMap('rest-params', [3,33], [437,7], 'items rest');
