/* jshint esnext:true */

var a = 'a';
var b = 'b';
var c = 'c';

var abc = { a, b, c };

assert.equal(abc.a, 'a');
assert.equal(abc.b, 'b');
assert.equal(abc.c, 'c');
