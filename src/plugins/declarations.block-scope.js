import mostRestrictiveKindForDeclaration from '../utils/mostRestrictiveKindForDeclaration';
import type Module from '../module';
import type { Path, Visitor } from '../types';

export type Options = {
  disableConst?: boolean | (path: Path) => boolean,
};

export const name = 'declarations.block-scope';
export const description = 'Transform `var` into `let` and `const` as appropriate.';

export function visitor(module: Module, options: Options={}): Visitor {
  return {
    VariableDeclaration(path: Path) {
      let { node } = path;

      if (node.kind !== 'var') {
        return;
      }

      let kind = mostRestrictiveKindForDeclaration(path);

      if (kind !== 'var') {
        if (kind === 'const' && !constAllowed(path, options)) {
          kind = 'let';
        }
        module.magicString.overwrite(node.start, node.start + 'var'.length, kind);
        node.kind = kind;
      } else {
        module.warn(
          node,
          'unsupported-declaration',
          `'var' declaration cannot be converted to block scope`
        );
      }
    }
  };
}

/**
 * Delegates to user-supplied options to determine whether `let` is allowed.
 */
function constAllowed(path: Path, options: Options): boolean {
  let { disableConst } = options;
  if (typeof disableConst === 'function') {
    return !disableConst(path);
  } else {
    return !disableConst;
  }
}
