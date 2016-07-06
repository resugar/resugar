(function(a, b) {
  return this[a] + this[b];
}.bind(this, 'a', 'b'));