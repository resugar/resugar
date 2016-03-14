import Module from './module';
import allPlugins from './plugins/index';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import shebangRegex from 'shebang-regex';
import type { RenderedModule } from './module';
import type { VisitorOption } from 'estraverse';
import { parse as espree } from 'espree';

export { default as run } from './cli';

type PluginBookendCallback = (m: Module) => ?Object;
type PluginTraversalCallback = (node: Object, module: Module, context: ?Object) => ?VisitorOption;

type Plugin = {
  begin: ?PluginBookendCallback,
  enter: ?PluginTraversalCallback,
  leave: ?PluginTraversalCallback,
  end: ?PluginBookendCallback
};

import type { Options as DeclarationsBlockScopeOptions } from './plugins/declarations.block-scope';

type Options = {
  plugins?: Array<Plugin>,
  validate?: boolean,
  'declarations.block-scope'?: ?DeclarationsBlockScopeOptions,
  parse?: (source: string) => Object
};

const PARSE_OPTIONS = {
  loc: true,
  range: true,
  sourceType: 'module',
  tokens: true
};

function defaultParse(source: string) {
  return espree(source, PARSE_OPTIONS);
}

export function convert(source: string, options: (Options|Array<Plugin>)={}): RenderedModule {
  if (Array.isArray(options)) {
    console.warn('convert(source, plugins) is deprecated, please call as convert(source, options)'); // eslint-disable-line no-console
    options = { plugins: options };
  }

  const { validate=true, plugins=allPlugins, parse=defaultParse } = options;

  const shebangMatch = source.match(shebangRegex);

  if (shebangMatch) {
    source = source.slice(shebangMatch.index + shebangMatch[0].length);
  }

  const module = new Module(null, source, parse(source));

  plugins.forEach(plugin => {
    const { name, begin, end, enter, leave } = plugin;
    const pluginOptions = options[name];
    const context = begin ? begin(module, pluginOptions) : null;

    estraverse.traverse(module.ast, {
      /**
       * When using a custom parser we tell estraverse to fall back to object
       * iteration when encountering node types it doesn't know. The most common
       * custom parser is probably babel-eslint, which tries to monkeypatch
       * eslint, estraverse, etc. However, it isn't perfect and may not
       * monkeypatch *our* estraverse, so we play it conservative here.
       */
      fallback: parse === defaultParse ? null : 'iteration',

      enter(node, parent) {
        Object.defineProperty(node, 'parentNode', {
          value: parent,
          configurable: true,
          enumerable: false
        });
        if (enter) {
          return enter(node, module, context);
        }
      },

      leave(node) {
        if (leave) {
          return leave(node, module, context);
        }
      }
    });

    if (end) {
      end(module, context);
    }
  });

  let result: RenderedModule = module.render();

  if (validate) {
    const error = validateResult(result, parse);
    if (error) {
      result.warnings.push({
        type: 'output-validation-failure',
        message: error.description,
        node: {
          loc: {
            start: {
              line: error.lineNumber,
              column: error.column - 1
            }
          }
        }
      });
    }
  }

  if (shebangMatch) {
    result.code = shebangMatch[0] + result.code;
  }

  return result;
}

function validateResult({ code }, parse: (source: string) => Object) {
  try {
    parse(code, { sourceType: 'module' });
    return null;
  } catch (ex) {
    return ex;
  }
}
