import estraverse from 'estraverse';
const { Syntax } = estraverse;

export default function isMemberExpression(node: Object, keyPath: ?(string|RegExp)=null): boolean {
  if (node.type !== Syntax.MemberExpression) {
    return false;
  }

  if (keyPath === null) {
    return true;
  }

  const actualKeyPath = memberExpressionKeyPath(node);

  if (typeof keyPath === 'string') {
    return keyPath === actualKeyPath;
  } else if (typeof keyPath.test === 'function') {
    return keyPath.test(actualKeyPath);
  } else {
    throw new TypeError(`keyPath is of unexpected type: ${typeof keyPath}`);
  }
}

function memberExpressionKeyPath(node: Object): ?string {
  switch (node.type) {
    case Syntax.Identifier:
      return node.name;

    case Syntax.MemberExpression:
      const objectPath = memberExpressionKeyPath(node.object);
      const propertyPath = memberExpressionKeyPath(node.property);
      if (!objectPath || !propertyPath || node.computed) {
        return null;
      }
      return `${objectPath}.${propertyPath}`;

    default:
      return null;
  }
}
