var es6arrowfn = require('es6-arrow-function');
var es6class = require('es6-class');
var regenerator = require('regenerator');

/**
 * Compile the given next-generation JavaScript into JavaScript usable in
 * today's runtime environments. Pass options to control which features to
 * include.
 *
 * Options
 *
 *   arrowFunction - Compile ES6 arrow functions into normal functions. Default: on.
 *   class - Compile ES6 classes into ES5 constructors. Default: on.
 *   generator - Compile generator functions into ES5. Default: on.
 *   includeRuntime - Include any runtime needed for compilers that require a
 *                    runtime. Default: variable.
 *
 * @param {string} source
 * @param {object} options
 * @return {{code:string, map:string}}
 */
function compile(source, options) {
  var maps = [];
  var compiled;

  if (!options) {
    options = {};
  }

  if (options.arrowFunction !== false) {
    compiled = es6arrowfn.compile(source);
    source = compiled.code;
    maps.push(compiled.map);
  }

  if (options['class'] !== false) {
    compiled = es6class.compile(source);
    source = compiled.code;
    maps.push(compiled.map);
  }

  if (options.generator !== false) {
    // TODO: get source maps from regenerator
    compiled = regenerator(source, {
      includeRuntime: options.includeRuntime
    });
    source = compiled;
  }

  // TODO: figure out how to combine the source maps
  return { code: source, map: '' };
}

/**
 * Transform the given next-generation JavaScript AST into a JavaScript AST
 * usable in today's runtime environments. Pass options to control which
 * features to include.
 *
 * Options
 *
 *   arrowFunction - Compile ES6 arrow functions into normal functions. Default: on.
 *   class - Compile ES6 classes into ES5 constructors. Default: on.
 *   generator - Compile generator functions into ES5. Default: on.
 *
 * @param {object} ast
 * @param {object} options
 * @return {object}
 */
function transform(ast, options) {
  if (!options) {
    options = {};
  }

  if (options.arrowFunction !== false) {
    ast = es6arrowfn.transform(ast);
  }

  if (options['class'] !== false) {
    ast = es6class.transform(ast);
  }

  if (options.generator !== false) {
    ast = regenerator.ast(source);
  }

  return ast;
}

exports.compile = compile;
