import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import * as Babel from '@babel/core';
import {
  addTrailingComment,
  copyLeadingComments
} from '@resugar/helper-comments';

export default function({ types: t }: typeof Babel): Babel.PluginObj {
  return {
    name: '@resugar/codemod-objects-shorthand',
    visitor: {
      ObjectProperty(path: NodePath<t.ObjectProperty>): void {
        const { node } = path;

        if (node.computed || node.shorthand) {
          return;
        }

        if (!t.isIdentifier(node.key) || !t.isIdentifier(node.value)) {
          return;
        }

        if (node.key.name !== node.value.name) {
          return;
        }

        node.shorthand = true;

        copyLeadingComments(node.value, node.key, addTrailingComment);
      }
    }
  };
}
