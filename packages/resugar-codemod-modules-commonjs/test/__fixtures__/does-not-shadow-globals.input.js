// don't give function a name that shadows the global
exports.clearTimeout = function(timeout) {
  clearTimeout(timeout);
};

// use the existing name that won't shadow a local or global
exports.setTimeout = function _setTimeout(callback, timeout) {
  setTimeout(callback, timeout);
};

// give function a local binding that won't shadow a local or global
function _clearInterval() {}
exports.clearInterval = function _clearInterval(interval) {
  clearInterval(interval);
};
