import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';

function hasMemberAccess(assignmentPath: NodePath<t.Node>): boolean {
  if (t.isMemberExpression(assignmentPath.node)) {
    return true;
  }
  let found = false;
  assignmentPath.traverse({
    MemberExpression(path: NodePath<t.MemberExpression>) {
      found = true;
      path.skip();
    }
  });
  return found;
}

function hasIdentifier(
  calleePath: NodePath<t.Expression>,
  names: Array<string>
): boolean {
  if (
    t.isIdentifier(calleePath.node) &&
    names.indexOf(calleePath.node.name) !== -1
  ) {
    return true;
  }
  let found = false;
  calleePath.traverse({
    Identifier(path: NodePath<t.Identifier>) {
      if (names.indexOf(path.node.name) !== -1) {
        found = true;
        path.skip();
      }
    }
  });
  return found;
}

/**
 * Return the position of the first line of code that might affect the global
 * object. Any require calls after this point cannot safely be turned into
 * import statements, since import statements are hoisted.
 */
export default function getFirstUnsafeLocation(
  programPath: NodePath<t.Program>,
  allowedFunctionIdentifiers: Array<string>
): number {
  let resultLoc = programPath.node.end!;

  programPath.traverse({
    AssignmentExpression(path: NodePath<t.AssignmentExpression>): void {
      if (hasMemberAccess(path.get('left'))) {
        resultLoc = Math.min(resultLoc, path.node.start!);
        path.skip();
      }
    },

    UpdateExpression(path: NodePath<t.UpdateExpression>): void {
      if (hasMemberAccess(path.get('argument'))) {
        resultLoc = Math.min(resultLoc, path.node.start!);
        path.skip();
      }
    },

    CallExpression(path: NodePath<t.CallExpression>): void {
      const callee = path.get('callee');
      if (
        callee.isExpression() &&
        !hasIdentifier(callee, allowedFunctionIdentifiers)
      ) {
        resultLoc = Math.min(resultLoc, path.node.start!);
        path.skip();
      }
    },

    ReturnStatement(path: NodePath<t.ReturnStatement>): void {
      resultLoc = Math.min(resultLoc, path.node.start!);
      path.skip();
    },

    ThrowStatement(path: NodePath<t.ThrowStatement>) {
      resultLoc = Math.min(resultLoc, path.node.start!);
      path.skip();
    }
  });

  return resultLoc;
}
