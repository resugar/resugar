import type { Reference, ScopeManager } from 'escope';

type DeclarationKind = 'var' | 'let' | 'const';

export default function mostRestrictiveKindForDeclaration(node: Object, scopeManager: ScopeManager): DeclarationKind {
  const declaredVariables = scopeManager.getDeclaredVariables(node);
  const blockScope = declaredVariables.every(variable =>
    variable.defs.length < 2 &&
      variable.references.every(referenceCouldBeBlockScope)
  );

  if (!blockScope) {
    return 'var';
  }

  const isConst = declaredVariables.every(variable =>
    variable.references.length > 0 &&
    variable.references.every(couldBeConstReference)
  );

  return isConst ? 'const' : 'let';
}

function couldBeConstReference(reference: Reference): boolean {
  return reference.init || reference.isReadOnly();
}

function referenceCouldBeBlockScope(reference: Reference): boolean {
  const referenceIndex = reference.identifier.range[0];
  const definitionIndex = reference.resolved.identifiers[0].range[0];
  return referenceIndex >= definitionIndex;
}
