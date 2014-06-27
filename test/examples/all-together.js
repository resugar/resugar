/* jshint esnext:true */

class Counter {
  constructor(count=0) {
    this.count = count;
  }

  makeIncr() {
    return () => this.count++;
  }

  consume(generator) {
    var info;

    while (!(info = generator.next()).done) {
      this.count += info.value;
    }
  }

  toString() {
    return `[Counter count=${this.count}]`;
  }

  static forCounts(...counts) {
    return counts.map(count => new this(count));
  }
}

function* upto(n) {
  var i = 0;

  while (i <= n) {
    yield i++;
  }

  return n;
}

var counter = new Counter();
var incr = counter.makeIncr();

incr();
assert.equal(counter.count, 1);

incr();
incr();
assert.equal(counter.count, 3);

counter.consume(upto(4));
assert.equal(counter.count, 13);
assert.equal(counter.toString(), '[Counter count=13]');

assert.deepEqual(
  Counter.forCounts(9, 99).map(counter => counter.count),
  [9, 99]
);

assert.deepEqual(
  Counter.forCounts(...[1, 2]).map(counter => counter.count),
  [1, 2]
);

assert.deepEqual(
  [for (x of Counter.forCounts(1, 2, 3).map(counter => counter.count)) x*x],
  [1, 4, 9]
);

assertMap('all-together', [3,6], [468,4], 'Class Counter');

assertMap('all-together', [4,15], [470,9], 'default param inside constructor');

assertMap('all-together', [5,5], [471,5], 'this.count = count');

assertMap('all-together', [21,5], [500,7], 'toString() return');

assertMap('all-together', [24,23], [509,11], 'rest of forCounts()');

