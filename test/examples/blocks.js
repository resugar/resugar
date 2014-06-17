/* jshint esnext:true */

const y = 10;
assert.equal(y, 10);

let obj = {
  a: "b"
}
assert.equal(obj.a, "b");

function simple(cb) {
  let a = 'let a';
  var b = 'var b';
  cb(a, b);
};
simple(function(a, b) {
  assert.equal(a, 'let a');
  assert.equal(b, 'var b');
});

var count = 0;
var i = 2;

for (let i = 0; i < 4; i++) {
  count++;
}
assert.equal(count, 4);
assert.equal(i, 2);

function example(x) {
  assert.throws(function() {
    z; // ReferenceError: z is not defined
  }, Error);
  if (x) {
    let z = 5;
    assert.equal(z, 5);
  }
}
example(true);

// Spec does not support defs says... ??
// function funWithBlocks() {
//   assert.throws(function() {
//     tuce; // ReferenceError: tuce is not defined
//   }, Error);

//   for( let tuce = 0; tuce < 5; tuce++ ) {
//     assert.doesNotThrow(function() {
//       tuce;
//     });
//   };

//   assert.throws(function() {
//     tuce; // ReferenceError: tuce is not defined
//   }, Error);
// };

// esprima errors on this Spec??
// function cray() {
//   assert.throws(function() {
//     sNotGetCray; // ReferenceError: sNotGetCray is not defined
//   }, Error);

//   let( sNotGetCray = 'now' ) {
//     assert.doesNotThrow(function() {
//       sNotGetCray;
//     });
//   };

//   assert.throws(function() {
//     sNotGetCray; // ReferenceError: sNotGetCray is not defined
//   }, Error);
// };
// cray();
