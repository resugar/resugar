/* jshint esnext:true */

class Test {}
var test = new Test();
assert.ok(test instanceof Test);

assertMap('classes', [3,7], [437,12], 'Test constructor');
