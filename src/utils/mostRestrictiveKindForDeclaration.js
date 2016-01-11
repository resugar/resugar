import estraverse from 'estraverse';
import type { Reference, ScopeManager } from 'escope';

const { Syntax } = estraverse;

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
  return referenceAfterDefinition(reference) && referenceInDefinitionParentBlock(reference);
}

function referenceAfterDefinition(reference: Reference): boolean {
  const referenceIndex = reference.identifier.range[0];
  const definitionIndex = reference.resolved.identifiers[0].range[0];
  return referenceIndex >= definitionIndex;
}

function referenceInDefinitionParentBlock(reference: Reference): boolean {
  let definitionName = reference.resolved.defs[0].name;
  let defBlock = definitionName;

  while (defBlock && !createsBlockScope(defBlock)) {
    defBlock = defBlock.parentNode;
  }

  if (!defBlock) {
    const { line, column } = definitionName.loc.start;
    throw new Error(
      `BUG: Expected a block containing '${definitionName.name}'` +
      `(${line}:${column + 1}) but did not find one.`
    );
  }

  let refBlock = reference.identifier;

  while (refBlock && refBlock !== defBlock) {
    refBlock = refBlock.parentNode;
  }

  return refBlock === defBlock;
}

function createsBlockScope(node: Object): boolean {
  switch (node.type) {
    case Syntax.Program:
    case Syntax.BlockStatement:
    case Syntax.ForStatement:
    case Syntax.ForInStatement:
      return true;

    default:
      return false;
  }
}
