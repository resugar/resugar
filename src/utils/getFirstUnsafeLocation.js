import * as t from '@babel/types';
import type { Path } from '../types';

function hasMemberAccess(assignmentPath: Path): boolean {
  if (t.isMemberExpression(assignmentPath.node)) {
    return true;
  }
  let found = false;
  assignmentPath.traverse({
    MemberExpression(path: Path) {
      found = true;
      path.skip();
    }
  });
  return found;
}

function hasIdentifier(calleePath: Path, names: Array<string>): boolean {
  if (t.isIdentifier(calleePath.node) && names.indexOf(calleePath.node.name) !== -1) {
    return true;
  }
  let found = false;
  calleePath.traverse({
    Identifier(path: Path) {
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
export default function getFirstUnsafeLocation(programPath: Path, allowedFunctionIdentifiers: Array<string>): number {
  let resultLoc = programPath.node.end;
  programPath.traverse({
    AssignmentExpression(path: Path) {
      if (hasMemberAccess(path.get('left'))) {
        resultLoc = Math.min(resultLoc, path.node.start);
        path.skip();
      }
    },
    UpdateExpression(path: Path) {
      if (hasMemberAccess(path.get('argument'))) {
        resultLoc = Math.min(resultLoc, path.node.start);
        path.skip();
      }
    },
    CallExpression(path: Path) {
      if (!hasIdentifier(path.get('callee'), allowedFunctionIdentifiers)) {
        resultLoc = Math.min(resultLoc, path.node.start);
        path.skip();
      }
    },
    ReturnStatement(path: Path) {
      resultLoc = Math.min(resultLoc, path.node.start);
      path.skip();
    },
    ThrowStatement(path: Path) {
      resultLoc = Math.min(resultLoc, path.node.start);
      path.skip();
    }
  });
  return resultLoc;
}
