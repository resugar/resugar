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
