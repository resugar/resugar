/* jshint undef:true, unused:true, node:true */

/**
 * We pull in example files from test/examples/*.js. Write your assertions in
 * the file alongside the code under test. The node `assert` library will
 * already be in the context.
 */

Error.stackTraceLimit = 20;

var esnext = require('../lib');
var recast = require('recast');

var fs = require('fs');
var path = require('path');
var RESULTS = 'test/results';

if (!fs.existsSync(RESULTS)) {
  fs.mkdirSync(RESULTS);
}

require('example-runner').runCLI(process.argv.slice(2), {
  transform: function(source, testName, filename, options) {
    var esnextOptions = {
      includeRuntime: true,
      sourceFileName: filename,
      sourceMapName: filename + '.map'
    };

    var fileOptions = options.esnext;
    if (fileOptions) {
      Object.keys(fileOptions).forEach(function(key) {
        esnextOptions[key] = fileOptions[key];
      });
    }

    var result = esnext.compile(source, esnextOptions);
    fs.writeFileSync(path.join(RESULTS, testName + '.js'), result.code, 'utf8');
    fs.writeFileSync(path.join(RESULTS, testName + '.js.map'), JSON.stringify(result.map), 'utf8');
    return result.code;
  },

  context: {
    compile: function(source, options) {
      return esnext.compile(source, options).code;
    },

    normalize: function(source) {
      return recast.prettyPrint(
        recast.parse(source)
      ).code;
    }
  }
});
