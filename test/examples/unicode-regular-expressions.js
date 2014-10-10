/* jshint esnext:true */

var string = 'foo\uD834\uDF06bar';
var match = string.match(/foo(.)bar/u);
assert.equal(match[1], '\uD834\uDF06');
