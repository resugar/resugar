var x = 'bar';
var y = 2;

object = {
  foo: 0,
  [this.x]: y,
  [++this.y]: 3
};

assert.equal(object.foo, 0);
assert.equal(object.bar, 2);
assert.equal(object["3"], 3);
