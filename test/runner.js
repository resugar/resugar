/**
 * We pull in example files from test/examples/*.js. Write your assertions in
 * the file alongside the code under test. The node `assert` library will
 * already be in the context.
 */

var compile = require('../lib').compile;
require('example-runner').runCLI(function(source) {
  return compile(source, { includeRuntime: true }).code;
});
