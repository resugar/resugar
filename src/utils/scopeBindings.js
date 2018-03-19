import * as t from '@babel/types';
import type { Scope } from '@babel/traverse';

export function claim(scope: Scope, name: string='ref'): { type: 'Identifier', name: string } {
  if (isUsedName(scope, name)) {
    let suffix = 1;
    let prefix = name;
    do {
      name = `${prefix}$${suffix++}`;
    } while (isUsedName(scope, name));
  }

  let program = scope.getProgramParent();
  program.references[name] = true;
  program.uids[name] = true;
  return t.identifier(name);
}

export function isDeclaredName(scope: Scope, name: string): boolean {
  return scope.hasBinding(name);
}

export function isUsedName(scope: Scope, name: string): boolean {
  return (
    scope.hasBinding(name) ||
    scope.hasGlobal(name)
    // FIXME: Do we want this?
    // scope.hasReference(name)
  );
}
