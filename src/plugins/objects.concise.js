import * as t from '@babel/types';
import cleanNode from '../utils/cleanNode.js';
import type Module from '../module';
import type { Node, Path, Visitor } from '../types';
import { findToken, findEndTokenBalanced } from '../utils/findTokens';

export const name = 'objects.concise';
export const description = 'Use concise object property method syntax.';

export function visitor(module: Module): Visitor {
  return {
    ObjectProperty(path: Path) {
      let { node } = path;

      if (node.method) {
        return;
      }

      if (!t.isFunctionExpression(node.value) || node.value.id) {
        return;
      }

      let tokens = module.tokensForNode(node);
      let keyEnd = node.key.end;
      let functionEnd;

      if (node.computed) {
        let { index: startBracketIndex } = findToken('[', tokens, 0);
        let { index: endBracketIndex, token: endBracket } = findEndTokenBalanced('[', ']', tokens, startBracketIndex);
        keyEnd = endBracket.end;
        functionEnd = findToken('function', tokens, endBracketIndex).token.end;
      } else {
        functionEnd = findToken('function', tokens, 0).token.end;
      }

      module.magicString.remove(keyEnd, functionEnd);
      metadata(module).properties.push(cleanNode(node));

      path.replaceWith(t.objectMethod(
        'method',
        node.key,
        node.value.params,
        node.value.body,
        node.computed
      ));
    }
  };
}

type Metadata = {
  properties: Array<Node>
};

function metadata(module: Module): Metadata {
  if (!module.metadata[name]) {
    module.metadata[name] = {
      properties: []
    };
  }
  return module.metadata[name];
}
