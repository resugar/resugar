import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import * as Babel from '@babel/core';
import { replaceWithAndPreserveComments } from '@resugar/helper-comments';

export default function({ types: t }: typeof Babel): Babel.PluginObj {
  return {
    name: '@resugar/codemod-functions-arrow',
    visitor: {
      FunctionExpression(path: NodePath<t.FunctionExpression>): void {
        let { node, parent } = path;

        // Skip generator functions.
        if (node.generator) {
          return;
        }

        // Only process anonymous functions.
        if (node.id) {
          return;
        }

        // Only process functions with a single return statement.
        if (node.body.body.length !== 1) {
          return;
        }

        // A directive like "use strict" is syntactically its own line, so if any
        // exist, we can't assume this is a single-line function.
        if (node.body.directives.length > 0) {
          return;
        }

        // `new` can't be called on arrow functions.
        if (t.isNewExpression(parent)) {
          return;
        }

        let [statement] = node.body.body;

        if (!t.isReturnStatement(statement) || !statement.argument) {
          return;
        }

        // Skip functions referencing `this` or `arguments`.
        if (referencesThisOrArguments(path)) {
          return;
        }

        rewriteBlocklessArrowFunction(path);
      },

      /**
       * Look for functions that are manually bound, e.g.
       *
       *   this.onclick = (function() {
       *     console.log('registering');
       *     this.register();
       *   }).bind(this);
       */
      CallExpression(path: NodePath<t.CallExpression>): void {
        const parent = path.parentPath;
        const callee = path.get('callee');

        if (!callee.isMemberExpression()) {
          return;
        }

        const object = callee.get('object');
        const property = callee.get('property') as NodePath<t.Node>;

        if (!object.isFunctionExpression() || object.node.id) {
          return;
        }

        if (!property.isIdentifier() || property.node.name !== 'bind') {
          return;
        }

        if (
          path.node.arguments.length !== 1 ||
          !t.isThisExpression(path.node.arguments[0])
        ) {
          return;
        }

        if (referencesArguments(object)) {
          return;
        }

        if (object.node.generator) {
          return;
        }

        // `new` can't be called on arrow functions.
        if (parent.isNewExpression()) {
          path.skip();
          return;
        }

        replaceWithAndPreserveComments(
          path,
          t.arrowFunctionExpression(
            object.node.params,
            object.node.body,
            object.node.async
          )
        );
      }
    }
  };
}

function referencesThisOrArguments(path: NodePath): boolean {
  let result = false;

  path.scope.traverse(path.node, {
    'FunctionDeclaration|FunctionExpression'(
      fnPath: NodePath<t.FunctionDeclaration> | NodePath<t.FunctionExpression>
    ): void {
      // Skip nested functions.
      fnPath.skip();
    },

    ThisExpression(thisPath: NodePath<t.ThisExpression>): void {
      result = true;
      thisPath.stop();
    },

    Identifier(identPath: NodePath<t.Identifier>): void {
      if (identPath.node.name === 'arguments') {
        result = true;
        identPath.stop();
      }
    }
  } as any);

  return result;
}

function referencesArguments(path: NodePath): boolean {
  let result = false;

  path.scope.traverse(path.node, {
    Function(fnPath: NodePath<t.Function>): void {
      // Skip nested functions.
      fnPath.skip();
    },

    Identifier(identPath: NodePath<t.Identifier>): void {
      if (identPath.node.name === 'arguments') {
        result = true;
        identPath.stop();
      }
    }
  });

  return result;
}

function rewriteBlocklessArrowFunction(path: NodePath<t.FunctionExpression>) {
  let { node } = path;
  let [statement] = node.body.body as Array<t.ReturnStatement>;

  const firstStatement = path.get('body').get('body')[0];

  if (!firstStatement.isReturnStatement()) {
    return;
  }

  replaceWithAndPreserveComments(firstStatement, firstStatement.node.argument!);

  replaceWithAndPreserveComments(
    path,
    t.arrowFunctionExpression(node.params, statement.argument!, node.async)
  );
}
