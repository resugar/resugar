import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import modulesCommonjs from '../src';
import { transform } from '@codemod/core';
import { NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';

defineTestSuites(join(__dirname, '__fixtures__'), [modulesCommonjs]);

describe('scope consistency', () => {
  test('default export binding is added to the scope', () => {
    transform('exports.a = 1;', {
      plugins: [
        [modulesCommonjs, { forceDefaultExport: true }],
        {
          visitor: {
            Program(path: NodePath<t.Program>): void {
              expect(scopeBindingNames(path.scope)).toContain('defaultExport');
            }
          }
        }
      ]
    });
  });

  test('named export binding is added to the scope', () => {
    transform('exports.a = 1;', {
      plugins: [
        modulesCommonjs,
        {
          visitor: {
            Program(path: NodePath<t.Program>): void {
              expect(scopeBindingNames(path.scope)).toContain('a');
            }
          }
        }
      ]
    });
  });

  function scopeBindingNames(scope: Scope): ReadonlyArray<string> {
    return Object.keys(scope.getAllBindings());
  }
});
