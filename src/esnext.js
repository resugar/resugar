import Module from './module';
import allPlugins from './plugins/index';
import parse from './utils/parse';
import shebangRegex from 'shebang-regex';
import traverse from '@babel/traverse';
import type { RenderedModule } from './module';
import type { Visitor } from './types';

export { default as run } from './cli';

type Plugin = {
  visitor: (module: Module) => Visitor,
};

import type { Options as DeclarationsBlockScopeOptions } from './plugins/declarations.block-scope';
import type { Options as ModulesCommonJSOptions } from './plugins/modules.commonjs';

type Options = {
  plugins?: Array<Plugin>,
  validate?: boolean,
  'declarations.block-scope'?: ?DeclarationsBlockScopeOptions,
  'modules.commonjs'?: ?ModulesCommonJSOptions,
};

export { allPlugins };

export function convert(source: string, options: (Options|Array<Plugin>)={}): RenderedModule {
  if (Array.isArray(options)) {
    console.warn('convert(source, plugins) is deprecated, please call as convert(source, options)'); // eslint-disable-line no-console
    options = { plugins: options };
  }

  let { validate=true, plugins=allPlugins } = options;
  let shebangMatch = source.match(shebangRegex);

  if (shebangMatch) {
    source = source.slice(shebangMatch.index + shebangMatch[0].length);
  }

  let module = new Module(null, source, parse(source));

  plugins.forEach(plugin => {
    let { name, visitor } = plugin;
    let pluginOptions = options[name];
    try {
      traverse(module.ast, visitor(module, pluginOptions));
      module.commit();
    } catch (e) {
      e.message = `Error running plugin ${name}: ${e.message}`;
      e.source = module.source;
      throw e;
    }
  });

  let result: RenderedModule = module.render();

  if (validate) {
    let error = validateResult(result);
    if (error) {
      result.warnings.push({
        type: 'output-validation-failure',
        message: error.message,
        node: {
          loc: {
            start: error.loc
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

function validateResult({ code }) {
  try {
    parse(code);
    return null;
  } catch (ex) {
    return ex;
  }
}
