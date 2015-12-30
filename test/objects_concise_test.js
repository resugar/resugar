import check from './support/check';
import { Syntax } from 'estraverse';

describe('Object Concise Plugin test', () => {
  it('collapses function properties into shorthand syntax', () => {
    check(`
      o = { a: function() {} };
    `, `
      o = { a() {} };
    `,
      {
        metadata: {
          'objects.concise': {
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
                  type: Syntax.FunctionExpression,
                  generator: false,
                  expression: false,
                  id: null,
                  params: [],
                  body: {
                    type: Syntax.BlockStatement,
                    body: []
                  }
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
                      shorthand: false,
                      method: true,
                      key: {
                        type: Syntax.Identifier,
                        name: 'a'
                      },
                      value: {
                        type: Syntax.FunctionExpression,
                        generator: false,
                        expression: false,
                        id: null,
                        params: [],
                        body: {
                          type: Syntax.BlockStatement,
                          body: []
                        }
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

  it('collapses properties with a computed key and function value', () => {
    check(`
      o = { [a]: function() {} };
    `, `
      o = { [a]() {} };
    `,
      {
        metadata: {
          'objects.concise': {
            properties: [
              {
                type: Syntax.Property,
                kind: 'init',
                computed: true,
                shorthand: false,
                method: false,
                key: {
                  type: Syntax.Identifier,
                  name: 'a'
                },
                value: {
                  type: Syntax.FunctionExpression,
                  generator: false,
                  expression: false,
                  id: null,
                  params: [],
                  body: {
                    type: Syntax.BlockStatement,
                    body: []
                  }
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
                      computed: true,
                      shorthand: false,
                      method: true,
                      key: {
                        type: Syntax.Identifier,
                        name: 'a'
                      },
                      value: {
                        type: Syntax.FunctionExpression,
                        generator: false,
                        expression: false,
                        id: null,
                        params: [],
                        body: {
                          type: Syntax.BlockStatement,
                          body: []
                        }
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

  it('collapses properties with a string key and function value', () => {
    check(`
      o = { 'a-b': function() {} };
    `, `
      o = { 'a-b'() {} };
    `,
      {
        metadata: {
          'objects.concise': {
            properties: [
              {
                type: Syntax.Property,
                kind: 'init',
                computed: false,
                shorthand: false,
                method: false,
                key: {
                  type: Syntax.Literal,
                  value: 'a-b',
                  raw: `'a-b'`
                },
                value: {
                  type: Syntax.FunctionExpression,
                  generator: false,
                  expression: false,
                  id: null,
                  params: [],
                  body: {
                    type: Syntax.BlockStatement,
                    body: []
                  }
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
                      shorthand: false,
                      method: true,
                      key: {
                        type: Syntax.Literal,
                        value: 'a-b',
                        raw: `'a-b'`
                      },
                      value: {
                        type: Syntax.FunctionExpression,
                        generator: false,
                        expression: false,
                        id: null,
                        params: [],
                        body: {
                          type: Syntax.BlockStatement,
                          body: []
                        }
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

  it('ignores properties with named function values', () => {
    check(`
      ({ a: function b() {} });
    `, `
      ({ a: function b() {} });
    `);
  });

  it('ignores already-concise properties', () => {
    check(`
      ({ a() {} });
    `, `
      ({ a() {} });
    `);
  });
});
