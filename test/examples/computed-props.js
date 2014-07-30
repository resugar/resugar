/* jshint esnext:true */

var x = 'a';
var y = 'b';

var foo = {
  [x + y]: 10
};

assert.equal(foo.ab, 10);
