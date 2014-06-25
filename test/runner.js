/**
 * We pull in example files from test/examples/*.js. Write your assertions in
 * the file alongside the code under test. The node `assert` library will
 * already be in the context.
 */

Error.stackTraceLimit = 20;

var esnext = require('../lib');
var recast = require('recast');
var esprima = require('esprima');

var fs = require('fs');
var path = require('path');
var RESULTS = 'test/results';
var EXAMPLES = 'test/examples';
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var assert = require('assert');

if (!fs.existsSync(RESULTS)) {
  fs.mkdirSync(RESULTS);
}

require('example-runner').runCLI(process.argv.slice(2), {
  transform: function(source, testName, filename) {
    var result = esnext.compile(source, {
      includeRuntime: true,
      sourceFileName: filename,
      sourceMapName: filename + '.map'
    });
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
        recast.parse(source, { esprima: esprima })
      ).code;
    },

    assertMap: function(testName, sourceLineCol, generatedLineCol, name) {
      var sourceFile = path.join(EXAMPLES, testName + '.js'),
          generatedFile = path.join(RESULTS, testName + '.js'),
          sourceMapFile = generatedFile + '.map',
          sourceMap = fs.readFileSync(sourceMapFile, "utf8"),
          map = new SourceMapConsumer(sourceMap),
          sourceMapping = map.originalPositionFor({
            line: generatedLineCol[0],
            column: generatedLineCol[1]
          }),
          name = name || '';
          console.log(map.mappings);


      assert.equal(sourceMapping.source, sourceFile,
                   'Incorrect name for sourceMap test in ' + sourceFile
                   + ' with a name of "' + name + '", expected ' + sourceFile + ', got ' + sourceMapping.source)
      assert.equal(sourceMapping.line, sourceLineCol[0],
                   'Incorrect line for sourceMap test in ' + sourceFile
                   + ', expected ' + sourceLineCol[0] + ', got ' + sourceMapping.line);
      assert.equal(sourceMapping.column, sourceLineCol[1],
                   'Incorrect column for sourceMap test in ' + sourceFile
                   + ', expected ' + sourceLineCol[1] + ', got ' + sourceMapping.column);
    }
  }
});
