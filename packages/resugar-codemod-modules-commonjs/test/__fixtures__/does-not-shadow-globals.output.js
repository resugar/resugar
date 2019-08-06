// don't give function a name that shadows the global
function _clearTimeout(timeout) {
  clearTimeout(timeout);
}

export { _clearTimeout as clearTimeout };

// use the existing name that won't shadow a local or global
let __setTimeout = function _setTimeout(callback, timeout) {
  setTimeout(callback, timeout);
};

export { __setTimeout as setTimeout };

// give function a local binding that won't shadow a local or global
function _clearInterval() {}

let __clearInterval = function _clearInterval(interval) {
  clearInterval(interval);
};

export { __clearInterval as clearInterval };
