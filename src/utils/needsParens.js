import estraverse from 'estraverse';

const { Syntax } = estraverse;

export default function needsParens(node: Object, parent: Object): boolean {
  switch (node.type) {
    case Syntax.ArrowFunctionExpression:
      switch (parent.type) {
        case Syntax.MemberExpression:
          return parent.object === node;

        case Syntax.BinaryExpression:
          return true;
      }
      break;
  }

  return false;
}
