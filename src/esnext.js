import allPlugins from './plugins/index';
import Module from './module';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import shebangRegex from 'shebang-regex';
import type { RenderedModule } from './module';
import type { VisitorOption } from 'estraverse';

export { default as run } from './cli';

type PluginBookendCallback = (m: Module) => ?Object;
type PluginTraversalCallback = (node: Object, parent: Object, module: Module, context: ?Object) => ?VisitorOption;

type Plugin = {
  begin: ?PluginBookendCallback,
  enter: ?PluginTraversalCallback,
  leave: ?PluginTraversalCallback,
  end: ?PluginBookendCallback
};

export function convert(source: string, plugins: Array<Plugin>=allPlugins): RenderedModule {
  const shebangMatch = source.match(shebangRegex);

  if (shebangMatch) {
    source = source.slice(shebangMatch.index + shebangMatch[0].length);
  }

  const module = new Module(null, source);

  plugins.forEach(plugin => {
    const { begin, end, enter, leave } = plugin;
    const context = begin ? begin(module) : null;

    estraverse.traverse(module.ast, {
      enter(node, parent) {
        if (enter) {
          return enter(node, parent, module, context);
        }
      },

      leave(node, parent) {
        if (leave) {
          return leave(node, parent, module, context);
        }
      }
    });

    if (end) {
      end(module, context);
    }
  });

  let result: RenderedModule = module.render();

  if (shebangMatch) {
    result.code = shebangMatch[0] + result.code;
  }

  return result;
}
