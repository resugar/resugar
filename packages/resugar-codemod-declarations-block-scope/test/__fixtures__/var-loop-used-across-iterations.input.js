for (var a of [1, 2, 3]) {
  var usedAcrossIterations;
  var usedWithinIteration;
  var initializedInLoop = true;
  var conditionallyAssignedInLoop;
  usedWithinIteration = true;
  if (false) {
    conditionallyAssignedInLoop = true;
  }
  console.log(usedAcrossIterations);
  console.log(usedWithinIteration);
  console.log(initializedInLoop);
  console.log(conditionallyAssignedInLoop);
  usedAcrossIterations = true;
}
