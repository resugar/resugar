/* jshint esnext:true */

var object = {a: 'a', b: 'b'},
    { a, b } = object;

assert.equal(a, 'a');
assert.equal(b, 'b');

var {objectSoftFail} = {};
assert.equal(objectSoftFail, undefined);

function parameterPosition({value: x}) {
  return x;
}

assert.equal(parameterPosition({value:5}), 5);

var array = [1, 2, 3],
    [one, , three] = array;

assert.equal(one, 1);
assert.equal(three, 3);

var [arraySoftFail] = [];
assert.equal(arraySoftFail, undefined);
