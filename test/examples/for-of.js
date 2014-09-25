/* jshint esnext:true */

function *characters(string) {
  var characters = string.split('');
  for (var nextChar of characters) yield nextChar;
}

function theyKnowYourName(names) {
  var cast = '';
  var i = 0;

  for (var name of names) {
    for (var char of characters(name)) cast += char;
    if (++i !== names.length) cast += ', ';
  }

  return cast;
}

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

assert.equal(theyKnowYourName(regulars), regulars.join(', '));
