import * as t from 'babel-types';
import type { Binding, Path } from '../types';

type DeclarationKind = 'var' | 'let' | 'const';

/**
 * Determines the most restrictive declaration kind for a variable declaration.
 * `const` is preferred, followed by `let` if one or more bindings are
 * reassigned, then `var` if block scoping cannot be used.
 */
export default function mostRestrictiveKindForDeclaration(path: Path): DeclarationKind {
  let ids = path.getBindingIdentifiers();
  let { scope } = path;
  let isConst = path.node.declarations.every(declaration => declaration.init);

  for (let id in ids) {
    let binding = scope.getBinding(id);

    // Does this binding disqualify block scoping for this declaration entirely?
    if (!bindingCouldBeBlockScope(binding)) {
      return 'var';
    }

    // Is this binding reassigned?
    if (isConst && !binding.constant) {
      isConst = false;
    }
  }

  return isConst ? 'const' : 'let';
}

/**
 * Does this binding meet the requirements for block scoping?
 */
function bindingCouldBeBlockScope(binding: Binding): boolean {
  // Are there duplicate declarations?
  if (binding.constantViolations.some(path => t.isVariableDeclarator(path.node))) {
    return false;
  }

  let definition = binding.path;
  let definitionBlockParent = findBlockParent(definition);

  return binding.referencePaths.every(reference =>
    // Does this reference come after the definition?
    reference.node.start > definition.node.start &&
    // Does this reference share the same block parent?
    hasAncestor(reference, definitionBlockParent)
  );
}

/**
 * Find the closest ancestor that creates a block scope.
 */
function findBlockParent(path: Path): Path {
  let parent: Path = path;

  while (!t.isBlockParent(parent.node)) {
    parent = parent.parentPath;
  }

  return parent;
}

/**
 * Determines whether `ancestor` is an ancestor of `path`.
 *
 * TODO: Use getEarliestCommonAncestorFrom?
 */
function hasAncestor(path: Path, ancestor: Path): boolean {
  if (path === ancestor) {
    return true;
  } else if (path.parentPath) {
    return hasAncestor(path.parentPath, ancestor);
  } else {
    return false;
  }
}
