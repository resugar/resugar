let callThing = (function(thing) {
  this[thing]();
}).bind(this);
