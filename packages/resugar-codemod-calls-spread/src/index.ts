import * as Babel from '@babel/core';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

/**
 * Arrays can be sparse, and `ArrayExpression` models that with `null` entries
 * in `elements`. This replaces those entries with an `undefined` node.
 */
function replaceSparseArrayElementsWithUndefined(
  elements: t.ArrayExpression['elements']
): Array<t.Expression | t.SpreadElement> {
  const undefinedNode = t.identifier('undefined');
  return elements.map(element => element || undefinedNode);
}

/**
 * Converts eligible `.apply` call expressions to use spread.
 *
 * @example
 *
 * Math.min.apply(Math, args); // before
 * Math.min(...args);          // after
 *
 * this.min.apply(this, args); // before
 * this.min(...args);          // after
 */
export default function(): Babel.PluginItem {
  return {
    name: '@resugar/codemod-calls-spread',
    visitor: {
      CallExpression(path: NodePath<t.CallExpression>): void {
        const contextName = m.capture(m.anyString());
        const identifierFn = m.capture(
          m.memberExpression(m.identifier(contextName), m.identifier(), false)
        );
        const thisFn = m.capture(
          m.memberExpression(m.thisExpression(), m.identifier(), false)
        );
        const bareFn = m.capture(m.identifier());
        const args = m.capture(m.anyExpression());
        const applyMatcher = m.or(
          m.callExpression(
            m.memberExpression(identifierFn, m.identifier('apply')),
            [m.identifier(m.fromCapture(contextName)), args]
          ),
          m.callExpression(m.memberExpression(thisFn, m.identifier('apply')), [
            m.thisExpression(),
            args
          ]),
          m.callExpression(m.memberExpression(bareFn, m.identifier('apply')), [
            m.nullLiteral(),
            args
          ])
        );

        m.match(
          applyMatcher,
          { identifierFn, thisFn, bareFn, args },
          path.node,
          ({ identifierFn, thisFn, bareFn, args }) => {
            path.replaceWith(
              t.callExpression(
                identifierFn || thisFn || bareFn,
                t.isArrayExpression(args)
                  ? // fn.apply(context, [1, 2, 3]) → fn(1, 2, 3)
                    replaceSparseArrayElementsWithUndefined(args.elements)
                  : // fn.apply(context, args) → fn(...args)
                    [t.spreadElement(args)]
              )
            );
          }
        );
      }
    }
  };
}
