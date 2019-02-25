// don't give function a name that shadows the global
function _clearTimeout(timeout) {
  clearTimeout(timeout);
}

export { _clearTimeout as clearTimeout };

// use the existing name that won't shadow a local or global
let _setTimeout2 = function _setTimeout(callback, timeout) {
  setTimeout(callback, timeout);
};

export { _setTimeout2 as setTimeout };

// give function a local binding that won't shadow a local or global
function _clearInterval() {}

let _clearInterval2 = function _clearInterval(interval) {
  clearInterval(interval);
};

export { _clearInterval2 as clearInterval };
