for (let a of [1, 2, 3]) {
  var usedAcrossIterations;
  let usedWithinIteration;
  const initializedInLoop = true;
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
