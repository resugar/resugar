var fs = require('fs');
var through = require('through');

var es6arrowfn = require('es6-arrow-function');
var es6class = require('es6-class');
var es6defaultParams = require('es6-default-params');
var es6restParams = require('es6-rest-params');
var es6spread = require('es6-spread');
var es6templates = require('es6-templates');
var regenerator = require('regenerator');
var es6comprehensions = require('es6-comprehensions');

var esprima = require('esprima');
var recast = require('recast');

/**
 * Compile the given next-generation JavaScript into JavaScript usable in
 * today's runtime environments. Pass options to control which features to
 * include. See {#transform} for the available options.
 *
 * @param {string} source
 * @param {object} options
 * @return {{code:string, map:string}}
 */
function compile(source, options) {
  if (!options) { options = {}; }
  var ast = recast.parse(source, {
    esprima: esprima,
    sourceFileName: options.sourceFileName
  });
  ast = transform(ast, options);
  return recast.print(ast, {
    sourceMapName: options.sourceMapName
  });
}

/**
 * Transform the given next-generation JavaScript AST into a JavaScript AST
 * usable in today's runtime environments. Pass options to control which
 * features to include. By default, all options are enabled.
 *
 * Options
 *
 *   arrayComprehensions - Compile ES6 array comprehensions.
 *   arrowFunction - Compile ES6 arrow functions into normal functions.
 *   class - Compile ES6 classes into ES5 constructors.
 *   defaultParams - Compile ES6 default parameters to ES5.
 *   generator - Compile generator functions into ES5.
 *   rest - Compile rest params into ES5.
 *   templates - Compile template strings into ES5.
 *
 * @param {object} ast
 * @param {object} options
 * @return {object}
 */
function transform(ast, options) {
  if (!options) { options = {}; }

  if (options.arrowFunction !== false) {
    ast = es6arrowfn.transform(ast);
  }

  if (options['class'] !== false) {
    ast = es6class.transform(ast);
  }

  if (options.rest !== false) {
    ast = es6restParams.transform(ast);
  }

  if (options.defaultParams !== false) {
    ast = es6defaultParams.transform(ast);
  }

  if (options.generator !== false) {
    ast = regenerator.transform(ast);
  }

  if (options.spread !== false) {
    ast = es6spread.transform(ast);
  }

  if (options.templates !== false) {
    ast = es6templates.transform(ast);
  }

  if (options.generator !== false && options.includeRuntime) {
    var runtime = fs.readFileSync(regenerator.runtime.dev, 'utf8');
    injectRuntime(runtime, regenerator.runtime.dev, ast.program);
  }

  if (options.arrayComprehensions !== false) {
    ast = es6comprehensions.transform(ast);
  }

  return ast;
}

/**
 * Originally from http://facebook.github.io/regenerator/.
 *
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */
function injectRuntime(runtime, filename, ast) {
  recast.types.builtInTypes.string.assert(runtime);
  recast.types.namedTypes.Program.assert(ast);

  // Include the runtime by modifying the AST rather than by concatenating
  // strings. This technique will allow for more accurate source mapping.
  if (runtime !== "") {
    var runtimeBody = recast.parse(runtime, {
      sourceFileName: filename
    }).program.body;

    var body = ast.body;
    body.unshift.apply(body, runtimeBody);
  }

  return ast;
}
/**
 * End Facebook Copyright.
 */

module.exports = function () {
  var data = '';
  return through(write, end);

  function write (buf) { data += buf; }
  function end () {
      this.queue(module.exports.compile(data).code);
      this.queue(null);
  }
};

module.exports.compile = compile;
module.exports.transform = transform;
