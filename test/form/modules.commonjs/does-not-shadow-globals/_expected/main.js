// don't give function a name that shadows the global
function clearTimeout$1(timeout) {
  clearTimeout(timeout);
}
export { clearTimeout$1 as clearTimeout };

// use the existing name that won't shadow a local or global
function _setTimeout(callback, timeout) {
  setTimeout(callback, timeout);
}
export { _setTimeout as setTimeout };

// give function a local binding that won't shadow a local or global
function _clearInterval() {}
let _clearInterval$1 = function _clearInterval(interval) {
  clearInterval(interval);
};
export { _clearInterval$1 as clearInterval };