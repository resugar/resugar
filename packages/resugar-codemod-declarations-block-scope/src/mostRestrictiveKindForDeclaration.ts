import * as t from '@babel/types';
import { Binding, NodePath } from '@babel/traverse';

type DeclarationKind = 'var' | 'let' | 'const';

/**
 * Determines the most restrictive declaration kind for a variable declaration.
 * `const` is preferred, followed by `let` if one or more bindings are
 * reassigned, then `var` if block scoping cannot be used.
 */
export default function mostRestrictiveKindForDeclaration(
  path: NodePath<t.VariableDeclaration>
): DeclarationKind {
  let ids = path.getBindingIdentifiers();
  let { scope } = path;
  let isConst = path.node.declarations.every(
    (declaration) => !!declaration.init
  );

  if (t.isSwitchCase(path.parent)) {
    return 'var';
  }

  if (
    t.isConditional(path.parent) &&
    (path.parent.consequent === path.node ||
      path.parent.alternate === path.node)
  ) {
    return 'var';
  }

  if (t.isLoop(path.parent) && path.parent.body === path.node) {
    return 'var';
  }

  for (let id in ids) {
    let binding = scope.getBinding(id)!;

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
  if (
    binding.constantViolations.some((path) => t.isVariableDeclarator(path.node))
  ) {
    return false;
  }

  let definition = binding.path as NodePath<t.VariableDeclarator>;
  let definitionBlockParent = definition.findParent((path) =>
    path.isBlockParent()
  );

  if (
    [...binding.referencePaths, ...binding.constantViolations].some(
      (reference) =>
        // Does this reference come before the definition?
        reference.node.start! < definition.node.start! ||
        // Does this reference exist outside the declaration block?
        !isDescendant(reference, definitionBlockParent) ||
        // Is this reference the initial binding value?
        reference === definition.get('init') ||
        // Is this reference inside the initial binding value?
        isDescendant(reference, definition.get('init') as NodePath<t.Node>)
    )
  ) {
    return false;
  }

  let functionParent = definition.getFunctionParent();
  let loopParent = definition.findParent((path) => path.isLoop());

  // Is this declaration within a loop in the current function scope?
  if (
    loopParent !== null &&
    (!functionParent || isDescendant(loopParent, functionParent))
  ) {
    // Is any reference within a closure?
    if (
      binding.referencePaths.some(
        (reference) => reference.getFunctionParent() !== functionParent
      )
    ) {
      return false;
    }

    if (!isBindingAssignedBeforeUse(binding)) {
      return false;
    }
  }

  return true;
}

function isDescendant(descendant: NodePath, ancestor: NodePath): boolean {
  if (descendant === ancestor) {
    return true;
  }

  if (!descendant.parentPath) {
    return false;
  }

  return isDescendant(descendant.parentPath, ancestor);
}

/**
 * Return true if we can statically determine that this variable always assigned
 * a value in its block before it is used. In other words, check if we can be
 * sure that the variable will never hold a value from a previous loop
 * iteration.
 */
function isBindingAssignedBeforeUse(binding: Binding): boolean {
  // Loop assignees are always initialized before use.
  let loopParent = binding.path.findParent((path) => path.isLoop());
  if (loopParent !== null) {
    if (loopParent.isForOfStatement() || loopParent.isForInStatement()) {
      if (
        isDescendant(binding.path, loopParent.get('left') as NodePath<t.Node>)
      ) {
        return true;
      }
    }
  }

  // Variables with an explicit init are always assigned before use.
  if (binding.path.isVariableDeclarator() && binding.path.node.init !== null) {
    return true;
  }

  // Find simple top-level assignments that occur before all usages. This could
  // theoretically be extended to do more advanced static analysis, e.g.
  // traversing into conditional blocks and ternary expressions to see if all
  // code paths assign to this variable, but this should get the common case.
  let blockParent = binding.path.findParent((path) => path.isBlockParent());
  let earliestUsage = Math.min(
    ...binding.referencePaths.map((reference) => reference.node.start!)
  );
  if (
    binding.constantViolations.some(
      (path) =>
        path.node.end! < earliestUsage &&
        path.isAssignmentExpression() &&
        path.parentPath.isExpressionStatement() &&
        path.parentPath.parentPath === blockParent
    )
  ) {
    return true;
  }

  return false;
}
