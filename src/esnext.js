import * as CommonJSPlugin from './plugins/modules.commonjs';
import MagicString from 'magic-string';
import Module from './module';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import shebangRegex from 'shebang-regex';
import type { RenderedModule } from './module';
import type { VisitorOption } from 'estraverse';
import { analyze } from 'escope';
import { parse } from 'espree';

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

  estraverse.traverse(module.ast, {
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
