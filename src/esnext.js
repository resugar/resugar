import * as CommonJSPlugin from './plugins/modules.commonjs';
import MagicString from 'magic-string';
import Module from './module';
import shebangRegex from 'shebang-regex';
import type { RenderedModule } from './module';
import type { VisitorOption } from 'estraverse';
import { analyze } from 'escope';
import { parse } from 'espree';
import { traverse } from 'estraverse';

const PARSE_OPTIONS = {
  range: true,
  ecmaFeatures: {
    // enable parsing of arrow functions
    arrowFunctions: true,

    // enable parsing of let/const
    blockBindings: true,

    // enable parsing of destructured arrays and objects
    destructuring: true,

    // enable parsing of regular expression y flag
    regexYFlag: true,

    // enable parsing of regular expression u flag
    regexUFlag: true,

    // enable parsing of template strings
    templateStrings: true,

    // enable parsing of binary literals
    binaryLiterals: true,

    // enable parsing of ES6 octal literals
    octalLiterals: true,

    // enable parsing unicode code point escape sequences
    unicodeCodePointEscapes: true,

    // enable parsing of default parameters
    defaultParams: true,

    // enable parsing of rest parameters
    restParams: true,

    // enable parsing of for-of statement
    forOf: true,

    // enable parsing computed object literal properties
    objectLiteralComputedProperties: true,

    // enable parsing of shorthand object literal methods
    objectLiteralShorthandMethods: true,

    // enable parsing of shorthand object literal properties
    objectLiteralShorthandProperties: true,

    // Allow duplicate object literal properties (except '__proto__')
    objectLiteralDuplicateProperties: true,

    // enable parsing of generators/yield
    generators: true,

    // enable parsing spread operator
    spread: true,

    // enable super in functions
    superInFunctions: true,

    // enable parsing classes
    classes: true,

    // enable parsing of new.target
    newTarget: false,

    // enable parsing of modules
    modules: true,

    // enable React JSX parsing
    jsx: true,

    // enable return in global scope
    globalReturn: true,

    // allow experimental object rest/spread
    experimentalObjectRestSpread: true
  }
};

type PluginBookendCallback = (m: Module) => ?Object;
type PluginTraversalCallback = (node: Object, parent: Object, module: Module, context: ?Object) => ?VisitorOption;

type Plugin = {
  begin: ?PluginBookendCallback,
  enter: ?PluginTraversalCallback,
  leave: ?PluginTraversalCallback,
  end: ?PluginBookendCallback
};

export function convert(source: string, plugins: Array<Plugin>=getDefaultPlugins()): RenderedModule {
  const shebangMatch = source.match(shebangRegex);

  if (shebangMatch) {
    source = source.slice(shebangMatch.index + shebangMatch[0].length);
  }

  const module = new Module(null, source);
  const pluginContexts = plugins.map(({ begin }) => begin && begin(module));

  traverse(module.ast, {
    enter(node, parent) {
      let index = 0;
      for (let { enter } of plugins) {
        if (enter) {
          const result = enter(node, parent, module, pluginContexts[index++]);
          if (result) {
            return result;
          }
        }
      }
    },

    leave(node, parent) {
      let index = 0;
      for (let { leave } of plugins) {
        if (leave) {
          const result = leave(node, parent, module, pluginContexts[index++]);
          if (result) {
            return result;
          }
        }
      }
    }
  });

  plugins.forEach(({ end }, i) => end && end(module, pluginContexts[i]));

  let result: RenderedModule = module.render();

  if (shebangMatch) {
    result.source = shebangMatch[0] + result.source;
  }

  return result;
}

export function getDefaultPlugins(): Array<Plugin> {
  return [CommonJSPlugin];
}
