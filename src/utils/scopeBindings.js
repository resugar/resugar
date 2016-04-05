import type { Scope } from 'escope';

let claimedBindingsByScope: Array<{ scope: Scope, bindings: { [key: string]: boolean } }> = [];

export function claim(scope: Scope, name: string='ref'): string {
  if (isUsedName(scope, name)) {
    let suffix = 1;
    let prefix = name;
    do {
      name = `${prefix}$${suffix++}`;
    } while (isUsedName(scope, name));
  }

  let claimedBindings = claimedBindingsForScope(scope);
  claimedBindings[name] = true;
  return name;
}

export function isUsedName(scope: Scope, name: string): boolean {
  if (scope.isUsedName(name)) {
    return true;
  }

  let claimedBindings = claimedBindingsForScope(scope);
  return claimedBindings[name] || false;
}

function claimedBindingsForScope(scope: Scope): { [key: string]: boolean } {
  for (let i = 0; i < claimedBindingsByScope.length; i++) {
    let scopeAndBindingList = claimedBindingsByScope[i];
    if (scopeAndBindingList.scope === scope) {
      return scopeAndBindingList.bindings;
    }
  }

  let bindings = Object.create(null);
  claimedBindingsByScope.push({ scope, bindings });
  return bindings;
}
