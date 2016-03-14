import estraverse from 'estraverse';

const { Syntax } = estraverse;

export default function needsParens(node: Object): boolean {
  switch (node.type) {
    case Syntax.ArrowFunctionExpression:
      switch (node.parentNode.type) {
        case Syntax.MemberExpression:
          return node.parentNode.object === node;

        case Syntax.BinaryExpression:
        case Syntax.SequenceExpression:
          return true;
      }
      break;
  }

  return false;
}
