/* jshint esnext:true */
/* esnext arrayComprehensions:true */

class Counter {
  constructor(count=0) {
    this.count = count;
  }

  makeIncr() {
    return () => this.count++;
  }

  consume(generator) {
    for (var value of generator) {
      this.count += value;
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

var counters = Counter.forCounts(1, 2, 3);
var [{count:x},{count:y},{count:z}] = counters;
assert.equal(x, 1);
assert.equal(y, 2);
assert.equal(z, 3);

var counterIteration = 1;
for (var currentCounter of counters) assert.equal(currentCounter.count, counterIteration++);

var three = [counters[2].count];

var countersHash = {
  [counters[0].count]: x,
  [counters[1].count]: y,
  [counters[2].count]: z,
  three
};
assert.equal(countersHash["1"], x);
assert.equal(countersHash["2"], y);
assert.equal(countersHash["3"], z);
assert.equal(countersHash["three"], z);
