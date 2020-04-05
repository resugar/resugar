import mostRestrictiveKindForDeclaration from './mostRestrictiveKindForDeclaration';
import { NodePath } from '@babel/traverse';
import { VariableDeclaration } from '@babel/types';
import * as Babel from '@babel/core';
import * as t from '@babel/types';

export interface Options {
  onWarn?: (node: t.Node, code: string, message: string) => void;
  disableConst?: boolean | ((path: NodePath) => boolean);
}

export default function (): Babel.PluginItem {
  return {
    name: '@resugar/codemod-declarations-block-scope',
    visitor: {
      VariableDeclaration(
        path: NodePath<VariableDeclaration>,
        state?: { opts?: Options }
      ) {
        const { node } = path;
        const options = (state && state.opts) || {};
        const onWarn = options.onWarn || (() => {});

        if (node.kind !== 'var') {
          return;
        }

        let kind = mostRestrictiveKindForDeclaration(path);

        if (kind !== 'var') {
          if (kind === 'const' && !constAllowed(path, options)) {
            kind = 'let';
          }
          node.kind = kind;
        } else {
          onWarn(
            node,
            'unsupported-declaration',
            `'var' declaration cannot be converted to block scope`
          );
        }
      },
    },
  };
}

/**
 * Delegates to user-supplied options to determine whether `let` is allowed.
 */
function constAllowed(path: NodePath, options: Options): boolean {
  let { disableConst } = options;
  if (typeof disableConst === 'function') {
    return !disableConst(path);
  } else {
    return !disableConst;
  }
}
