import check from './support/check';
import { Syntax } from 'estraverse';

describe('Object Shorthand Plugin test', () => {
  it('collapses properties with the same key & value identifier', () => {
    check(`
      o = { a: a };
    `, `
      o = { a };
    `,
      {
        metadata: {
          'objects.shorthand': {
            properties: [
              {
                type: Syntax.Property,
                kind: 'init',
                computed: false,
                shorthand: false,
                method: false,
                key: {
                  type: Syntax.Identifier,
                  name: 'a'
                },
                value: {
                  type: Syntax.Identifier,
                  name: 'a'
                }
              }
            ]
          }
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.ExpressionStatement,
              expression: {
                type: Syntax.AssignmentExpression,
                operator: '=',
                left: {
                  type: Syntax.Identifier,
                  name: 'o'
                },
                right: {
                  type: Syntax.ObjectExpression,
                  properties: [
                    {
                      type: Syntax.Property,
                      kind: 'init',
                      computed: false,
                      shorthand: true,
                      method: false,
                      key: {
                        type: Syntax.Identifier,
                        name: 'a'
                      },
                      value: {
                        type: Syntax.Identifier,
                        name: 'a'
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    );
  });

  it('does not collapse properties with a computed key matching the value', () => {
    check(`
      o = { [a]: a };
    `, `
      o = { [a]: a };
    `);
  });

  it('ignores already-shorthand properties', () => {
    check(`
      ({ a });
    `, `
      ({ a });
    `);
  });
});
