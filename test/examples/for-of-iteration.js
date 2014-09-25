/* jshint esnext:true */

var regulars = [
  "Sam Malone",
  "Carla Tortelli",
  "Norm Peterson",
  "Frasier Crane",
  "Woody Boyd",
  "Diane Chambers",
  "Ernie Pantusso",
  "Al"
];

var i = 0;
for (var name of regulars) {
  assert.equal(name, regulars[i++]);
}
