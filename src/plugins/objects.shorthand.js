import * as t from '@babel/types';
import cleanNode from '../utils/cleanNode.js';
import type Module from '../module';
import type { Path, Visitor } from '../types';
import { findTokenMatchingPredicate } from '../utils/findTokens';

export const name = 'objects.shorthand';
export const description = 'Use shorthand notation for object properties.';

export function visitor(module: Module): Visitor {
  let meta = metadata(module);

  return {
    ObjectProperty(path: Path) {
      let { node } = path;

      if (node.computed || node.shorthand) {
        return;
      }

      if (!t.isIdentifier(node.key) || !t.isIdentifier(node.value)) {
        return;
      }

      if (node.key.name !== node.value.name) {
        return;
      }

      let tokens = module.tokensForNode(node);
      let { index: keyTokenIndex, token: keyToken } = findTokenMatchingPredicate(token => token.start === node.key.start, tokens);
      let { index: colonTokenIndex, token: colonToken } = findTokenMatchingPredicate(token => token.type.label === ':', tokens, keyTokenIndex);
      let { token: valueToken } = findTokenMatchingPredicate(token => token.start === node.value.start, tokens, colonTokenIndex);
      let sourceBetweenKeyAndColon = module.source.slice(keyToken.end, colonToken.start);
      let sourceBetweenColonAndValue = module.source.slice(colonToken.end, valueToken.start);

      // `a /* 1 */ : /* 2 */ a` -> `/* 1 *//* 2 */a`
      //  ^^^^^^^^^^^                ^^^^^^^
      module.magicString.overwrite(
        keyToken.start,
        colonToken.end,
        sourceBetweenKeyAndColon.trim()
      );

      // `a /* 1 */ : /* 2 */ a` -> `/* 1 *//* 2 */a`
      //             ^^^^^^^^^              ^^^^^^^
      if (colonToken.end !== valueToken.start) {
        module.magicString.overwrite(
          colonToken.end,
          valueToken.start,
          sourceBetweenColonAndValue.trim()
        );
      }

      meta.properties.push(cleanNode(node));
      node.shorthand = true;
    }
  };
}

type Metadata = {
  properties: Array<Object>
};

function metadata(module: Module): Metadata {
  if (!module.metadata[name]) {
    module.metadata[name] = { properties: [] };
  }
  return module.metadata[name];
}
