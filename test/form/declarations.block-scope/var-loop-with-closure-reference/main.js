funcs = [];
for (var a of [1, 2, 3]) {
  var b = 4;
  var c = 5;
  funcs.append(function() {
    console.log(a);
  });
  funcs.append(() => {
    console.log(b);
  });
  console.log(c);
}
