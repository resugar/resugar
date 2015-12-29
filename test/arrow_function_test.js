import check from './support/check';
import { Syntax } from 'estraverse';

describe('Arrow Function plugin', () => {
  it('rewrites functions that are just a return statement as an arrow function', () => {
    check(`
      map([1, 2, 3], function(n) {
        return n * 2;
      });
    `, `
      map([1, 2, 3], n => n * 2);
    `,
      {
        metadata: {
          'functions.arrow': {
            functions: [
              {
                type: Syntax.FunctionExpression,
                id: null,
                generator: false,
                expression: false,
                params: [
                  {
                    type: Syntax.Identifier,
                    name: 'n'
                  }
                ],
                body: {
                  type: Syntax.BlockStatement,
                  body: [
                    {
                      type: Syntax.ReturnStatement,
                      argument: {
                        type: Syntax.BinaryExpression,
                        operator: '*',
                        left: {
                          type: Syntax.Identifier,
                          name: 'n'
                        },
                        right: {
                          type: Syntax.Literal,
                          value: 2,
                          raw: '2'
                        }
                      }
                    }
                  ]
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
                type: Syntax.CallExpression,
                callee: {
                  type: Syntax.Identifier,
                  name: 'map'
                },
                arguments: [
                  {
                    type: Syntax.ArrayExpression,
                    elements: [
                      {
                        type: Syntax.Literal,
                        value: 1,
                        raw: '1'
                      },
                      {
                        type: Syntax.Literal,
                        value: 2,
                        raw: '2'
                      },
                      {
                        type: Syntax.Literal,
                        value: 3,
                        raw: '3'
                      }
                    ]
                  },
                  {
                    type: Syntax.ArrowFunctionExpression,
                    generator: false,
                    expression: false,
                    id: null,
                    params: [
                      {
                        type: Syntax.Identifier,
                        name: 'n'
                      }
                    ],
                    body: {
                      type: Syntax.BinaryExpression,
                      operator: '*',
                      left: {
                        type: Syntax.Identifier,
                        name: 'n'
                      },
                      right: {
                        type: Syntax.Literal,
                        value: 2,
                        raw: '2'
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    );
  });

  it('rewrites functions with a single return statement with multiple arguments', () => {
    check(`
      map([1, 2, 3], function(n, i) {
        return n * i;
      });
    `, `
      map([1, 2, 3], (n, i) => n * i);
    `,
      {
        metadata: {
          'functions.arrow': {
            functions: [
              {
                type: 'FunctionExpression',
                id: null,
                generator: false,
                expression: false,
                params: [
                  {
                    type: 'Identifier',
                    name: 'n'
                  },
                  {
                    type: 'Identifier',
                    name: 'i'
                  }
                ],
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'ReturnStatement',
                      argument: {
                        type: 'BinaryExpression',
                        operator: '*',
                        left: {
                          type: 'Identifier',
                          name: 'n'
                        },
                        right: {
                          type: 'Identifier',
                          name: 'i'
                        }
                      }
                    }
                  ]
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
                type: Syntax.CallExpression,
                callee: {
                  type: Syntax.Identifier,
                  name: 'map'
                },
                arguments: [
                  {
                    type: Syntax.ArrayExpression,
                    elements: [
                      {
                        type: Syntax.Literal,
                        value: 1,
                        raw: '1'
                      },
                      {
                        type: Syntax.Literal,
                        value: 2,
                        raw: '2'
                      },
                      {
                        type: Syntax.Literal,
                        value: 3,
                        raw: '3'
                      }
                    ]
                  },
                  {
                    type: Syntax.ArrowFunctionExpression,
                    generator: false,
                    expression: false,
                    id: null,
                    params: [
                      {
                        type: Syntax.Identifier,
                        name: 'n'
                      },
                      {
                        type: Syntax.Identifier,
                        name: 'i'
                      }
                    ],
                    body: {
                      type: Syntax.BinaryExpression,
                      operator: '*',
                      left: {
                        type: Syntax.Identifier,
                        name: 'n'
                      },
                      right: {
                        type: Syntax.Identifier,
                        name: 'i'
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    );
  });

  it('does not rewrite functions that have a name', () => {
    check(`
      [].map(function identity(item) { return item; });
    `, `
      [].map(function identity(item) { return item; });
    `,
      {
        metadata: {
          'functions.arrow': {
            functions: []
          }
        }
      }
    );
  });

  it('does not rewrite functions that reference `this`', () => {
    check(`
      $('.button').on('click', function() {
        return this.attr('href') !== '';
      });
    `, `
      $('.button').on('click', function() {
        return this.attr('href') !== '';
      });
    `,
      {
        metadata: {
          'functions.arrow': {
            functions: []
          }
        }
      }
    );
  });

  it('rewrites functions that reference `this` only inside a nested function', () => {
    check(`
      a(function() {
        return function getThis() { return this; };
      });
    `, `
      a(() => function getThis() { return this; });
    `,
      {
        metadata: {
          'functions.arrow': {
            functions: [
              {
                type: Syntax.FunctionExpression,
                id: null,
                generator: false,
                expression: false,
                params: [],
                body: {
                  type: Syntax.BlockStatement,
                  body: [
                    {
                      type: Syntax.ReturnStatement,
                      argument: {
                        type: Syntax.FunctionExpression,
                        id: {
                          type: Syntax.Identifier,
                          name: 'getThis'
                        },
                        params: [],
                        generator: false,
                        expression: false,
                        body: {
                          type: Syntax.BlockStatement,
                          body: [
                            {
                              type: Syntax.ReturnStatement,
                              argument: {
                                type: Syntax.ThisExpression
                              }
                            }
                          ]
                        }
                      }
                    }
                  ]
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
                type: Syntax.CallExpression,
                callee: {
                  type: Syntax.Identifier,
                  name: 'a'
                },
                arguments: [
                  {
                    type: Syntax.ArrowFunctionExpression,
                    generator: false,
                    expression: false,
                    id: null,
                    params: [],
                    body: {
                      type: Syntax.FunctionExpression,
                      generator: false,
                      expression: false,
                      id: {
                        type: Syntax.Identifier,
                        name: 'getThis'
                      },
                      params: [],
                      body: {
                        type: Syntax.BlockStatement,
                        body: [
                          {
                            type: Syntax.ReturnStatement,
                            argument: {
                              type: Syntax.ThisExpression
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    );
  });
});
