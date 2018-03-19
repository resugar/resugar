import * as t from '@babel/types';
import cleanNode from '../utils/cleanNode.js';
import type Module from '../module';
import type { Path, Visitor } from '../types';

export const name = 'objects.destructuring';
export const description = 'Transform some declarations and assignments to the more compact destructuring form.';

export function visitor(module: Module): Visitor {
  let meta = metadata(module);

  return {
    VariableDeclaration(path: Path) {
      let { node } = path;

      for (let index = 0; index < node.declarations.length; index++) {
        let elements = extractSequentialDestructurableElements(module, node.declarations, index);
        rewriteDestructurableElements(module, elements);

        if (elements.length !== 0) {
          // Add information about the transformation.
          meta.push({
            ids: elements.map(({ id }) => cleanNode(id)),
            inits: elements.map(({ init }) => cleanNode(init))
          });

          // Mutate the AST to reflect the new reality.
          node.declarations.splice(index, elements.length, t.variableDeclarator(
            t.objectPattern(
              elements.map(declarator => t.objectProperty(
                declarator.id,
                declarator.id,
                false,
                true
              ))
            ),
            elements[0].init.object
          ));
        }
      }
    },

    AssignmentExpression(path: Path) {
      if (!t.isExpressionStatement(path.parent)) {
        return;
      }

      let { node } = path;
      let assignments = extractSequentialDestructurableElements(module, [node]);

      if (assignments.length === 0) {
        return;
      }

      // `a = obj.a;` -> `(a = obj.a);`
      //                  ^         ^
      module.magicString.appendLeft(assignments[0].start, '(');
      module.magicString.appendRight(assignments[assignments.length - 1].end, ')');

      rewriteDestructurableElements(module, assignments);

      // Add information about the transformation.
      meta.push({
        ids: assignments.map(assignment => cleanNode(assignment.left)),
        inits: assignments.map(assignment => cleanNode(assignment.right))
      });

      path.replaceWith(t.assignmentExpression(
        '=',
        t.objectPattern(
          assignments.map(assignment => t.objectProperty(
            t.identifier(assignment.left.name),
            t.identifier(assignment.left.name),
            false,
            true
          ))
        ),
        node.right.object
      ));
    },

    SequenceExpression(path: Path) {
      let {
        node: { expressions }
      } = path;

      for (let index = 0; index < expressions.length; index++) {
        let assignments = extractSequentialDestructurableElements(module, expressions, index);

        if (assignments.length > 0 && index === 0) {
          // `a = obj.a;` -> `(a = obj.a);`
          module.magicString.appendLeft(assignments[0].start, '(');
          module.magicString.appendRight(assignments[assignments.length - 1].end, ')');
        }

        if (assignments.length > 0) {
          rewriteDestructurableElements(module, assignments);

          meta.push({
            ids: assignments.map(assignment => cleanNode(assignment.left)),
            inits: assignments.map(assignment => cleanNode(assignment.right))
          });

          expressions.splice(index, assignments.length, t.assignmentExpression(
            '=',
            t.objectPattern(
              assignments.map(({ left }) => t.objectProperty(
                left, left, false, true
              ))
            ),
            assignments[0].right.object
          ));
        }
      }

      if (expressions.length === 1) {
        path.replaceWith(expressions[0]);
      }
    }
  };
}

function extractSequentialDestructurableElements(module: Module, elements: Array<Object>, start=0): Array<Object> {
  let result = [];
  let objectSource = null;

  for (let i = start; i < elements.length; i++) {
    let element = elements[i];
    let { left, right } = leftRightOfAssignment(element) || {};

    if (!t.isIdentifier(left)) {
      break;
    }

    if (!t.isMemberExpression(right)) {
      break;
    }

    if (right.computed) {
      break;
    }

    if (left.name !== right.property.name) {
      break;
    }

    let thisObjectSource = module.sourceOf(right.object);

    if (!objectSource) {
      objectSource = thisObjectSource;
    } else if (objectSource !== thisObjectSource) {
      break;
    }

    result.push(element);

    if (!isSafeToConsolidate(right.object)) {
      break;
    }
  }

  return result;
}

function rewriteDestructurableElements(module: Module, elements: Array<Object>) {
  if (elements.length === 0) {
    return;
  }

  let firstElement = elements[0];

  // `const a = obj.a, b = obj.b;` -> `const { a = obj.a, b = obj.b;`
  //                                         ^^
  module.magicString.appendLeft(leftRightOfAssignment(firstElement).left.start, '{ ');

  for (let i = 0; i < elements.length - 1; i++) {
    let { left, right } = leftRightOfAssignment(elements[i]);
    // `const { a = obj.a, b = obj.b;` -> `const { a, b = obj.b;`
    //           ^^^^^^^^
    module.magicString.remove(left.end, right.end);
  }

  let lastElement = elements[elements.length - 1];
  let { left: lastLeft, right: lastRight } = leftRightOfAssignment(lastElement);

  // `const { a, b = obj.b;` -> `const { a, b } = obj.b;`
  //                                         ^^
  module.magicString.appendRight(lastLeft.end, ' }');

  let dotToken = getDotToken(module, lastRight);
  // `const { a, b } = obj.b;` -> `const { a, b } = obj;`
  //                      ^^
  module.magicString.remove(dotToken.start, lastRight.end);
}

function getDotToken(module: Module, memberAccessExpression: Object): Token {
  let intermediateTokens = module.tokensInRange(
    memberAccessExpression.object.end, memberAccessExpression.property.start);
  let dotTokenIndex = intermediateTokens.length - 1;
  while (dotTokenIndex >= 0 && intermediateTokens[dotTokenIndex].type.label !== '.') {
    dotTokenIndex -= 1;
  }
  if (dotTokenIndex < 0) {
    throw new Error('Expected to find a dot token in a member access expression.');
  }
  return intermediateTokens[dotTokenIndex];
}

type DestructuringMetadata = {
  ids: Array<Object>,
  inits: Array<Object>
};

type Metadata = Array<DestructuringMetadata>;

function metadata(module: Module): Metadata {
  if (!module.metadata[name]) {
    module.metadata[name] = [];
  }
  return module.metadata[name];
}

function leftRightOfAssignment(node: Object): ?{ left: Object, right: Object } {
  if (t.isVariableDeclarator(node)) {
    return { left: node.id, right: node.init };
  } else if (t.isAssignmentExpression(node) && node.operator === '=') {
    return { left: node.left, right: node.right };
  } else {
    return null;
  }
}

function isSafeToConsolidate(node: Object): boolean {
  return t.isIdentifier(node);
}
