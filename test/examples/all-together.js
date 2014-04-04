/* jshint esnext:true */

class Counter {
  constructor(count) {
    this.count = count || 0;
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
