import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import * as Babel from '@babel/core';

export default function({ types: t }: typeof Babel): Babel.PluginObj {
  return {
    name: '@resugar/codemod-objects-destructuring',
    visitor: {
      VariableDeclaration(path: NodePath<t.VariableDeclaration>) {
        let { node } = path;

        for (let index = 0; index < node.declarations.length; index++) {
          let elements = extractSequentialDestructurableElements(
            node.declarations,
            index
          );

          if (elements.length !== 0) {
            node.declarations.splice(
              index,
              elements.length,
              t.variableDeclarator(
                t.objectPattern(
                  elements.map(declarator =>
                    t.objectProperty(
                      declarator.id,
                      declarator.id as t.Expression,
                      false,
                      true
                    )
                  )
                ),
                (elements[0].init! as t.MemberExpression).object
              )
            );
          }
        }
      },

      AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
        if (!t.isExpressionStatement(path.parent)) {
          return;
        }

        let { node } = path;
        let assignments = extractSequentialDestructurableElements([node]);

        if (assignments.length === 0) {
          return;
        }

        path.replaceWith(
          t.assignmentExpression(
            '=',
            t.objectPattern(
              assignments.map(assignment =>
                t.objectProperty(
                  t.identifier((assignment.left as t.Identifier).name),
                  t.identifier((assignment.left as t.Identifier).name),
                  false,
                  true
                )
              )
            ),
            (node.right as t.MemberExpression).object
          )
        );
      },

      SequenceExpression(path: NodePath<t.SequenceExpression>) {
        let {
          node: { expressions }
        } = path;

        for (let index = 0; index < expressions.length; index++) {
          let assignments = extractSequentialDestructurableElements(
            expressions as Array<t.AssignmentExpression>,
            index
          );

          if (assignments.length > 0) {
            expressions.splice(
              index,
              assignments.length,
              t.assignmentExpression(
                '=',
                t.objectPattern(
                  assignments.map(({ left }) =>
                    t.objectProperty(left, left as t.Expression, false, true)
                  )
                ),
                (assignments[0].right as t.MemberExpression).object
              )
            );
          }
        }

        if (expressions.length === 1) {
          path.replaceWith(expressions[0]);
        }
      }
    }
  };
}

function extractSequentialDestructurableElements<T extends t.Node>(
  elements: Array<T>,
  start = 0
): Array<T> {
  const result = [];
  let destructurable: string | undefined;

  for (let i = start; i < elements.length; i++) {
    let element = elements[i];
    let leftRight = leftRightOfAssignment(element);

    if (!leftRight) {
      break;
    }

    let { left, right } = leftRight;

    if (!t.isIdentifier(left)) {
      break;
    }

    if (!right || !t.isMemberExpression(right)) {
      break;
    }

    if (right.computed) {
      break;
    }

    if (left.name !== right.property.name) {
      break;
    }

    if (destructurable) {
      if (
        !t.isIdentifier(right.object) ||
        right.object.name !== destructurable
      ) {
        break;
      }
    } else if (t.isIdentifier(right.object)) {
      destructurable = right.object.name;
    }

    result.push(element);

    if (!t.isIdentifier(right.object)) {
      break;
    }
  }

  return result;
}

function leftRightOfAssignment(
  node: t.Node
): { left: t.LVal; right: t.Expression | null } | null {
  if (t.isVariableDeclarator(node)) {
    return { left: node.id, right: node.init };
  } else if (t.isAssignmentExpression(node) && node.operator === '=') {
    return { left: node.left, right: node.right };
  } else {
    return null;
  }
}

function isSafeToConsolidate(node: t.Node): boolean {
  return t.isIdentifier(node);
}
