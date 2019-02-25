import * as Babel from '@babel/core';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export default function({ types: t }: typeof Babel): Babel.PluginObj {
  return {
    name: '@resugar/codemod-objects-concise',
    visitor: {
      ObjectProperty(path: NodePath<t.ObjectProperty>) {
        const { node } = path;

        if (!t.isFunctionExpression(node.value) || node.value.id) {
          return;
        }

        path.replaceWith(
          t.objectMethod(
            'method',
            node.key,
            node.value.params,
            node.value.body,
            node.computed
          )
        );
      }
    }
  };
}
