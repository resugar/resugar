import check from './support/check';
import { Syntax } from 'estraverse';

describe('String template plugin', () => {
  it('does not affect standalone strings', () => {
    check(`'a';`, `'a';`);
  });

  it('combines concatenated string literals preserving quotes', () => {
    check(`
      let s = "foo" + 'bar';
    `, `
      let s = "foobar";
    `,
      {
        metadata: {
          'strings.template': {
            concatenations: [
              {
                node: {
                  type: Syntax.BinaryExpression,
                  operator: '+',
                  left: {
                    type: Syntax.Literal,
                    value: 'foo',
                    raw: '"foo"'
                  },
                  right: {
                    type: Syntax.Literal,
                    value: 'bar',
                    raw: "'bar'"
                  }
                },
                parts: [
                  {
                    type: Syntax.Literal,
                    value: 'foo',
                    raw: '"foo"'
                  },
                  {
                    type: Syntax.Literal,
                    value: 'bar',
                    raw: "'bar'"
                  }
                ]
              }
            ]
          }
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'let',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.Identifier,
                    name: 's'
                  },
                  init: {
                    type: Syntax.Literal,
                    value: 'foobar',
                    raw: '"foobar"'
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('combines concatenated string literals handling escaping properly', () => {
    check(`
      let a = '"' + "'";
      let b = "'" + '"';
    `, `
      let a = '"\\'';
      let b = "'\\"";
    `,
      {
        metadata: {
          'strings.template': {
            concatenations: [
              {
                node: {
                  type: Syntax.BinaryExpression,
                  operator: '+',
                  left: {
                    type: Syntax.Literal,
                    value: '"',
                    raw: `'"'`
                  },
                  right: {
                    type: Syntax.Literal,
                    value: `'`,
                    raw: `"'"`
                  }
                },
                parts: [
                  {
                    type: Syntax.Literal,
                    value: '"',
                    raw: `'"'`
                  },
                  {
                    type: Syntax.Literal,
                    value: `'`,
                    raw: `"'"`
                  }
                ]
              },
              {
                node: {
                  type: Syntax.BinaryExpression,
                  operator: '+',
                  left: {
                    type: Syntax.Literal,
                    value: `'`,
                    raw: `"'"`
                  },
                  right: {
                    type: Syntax.Literal,
                    value: '"',
                    raw: `'"'`
                  }
                },
                parts: [
                  {
                    type: Syntax.Literal,
                    value: `'`,
                    raw: `"'"`
                  },
                  {
                    type: Syntax.Literal,
                    value: '"',
                    raw: `'"'`
                  }
                ]
              }
            ]
          }
        }
      }
    );
  });

  it('escapes backticks in generated template strings', () => {
    check(`
      let s = "\`" + a;
    `, `
      let s = \`\\\`\${a}\`;
    `,
      {
        metadata: {
          'strings.template': {
            concatenations: [
              {
                node: {
                  type: Syntax.BinaryExpression,
                  operator: '+',
                  left: {
                    type: Syntax.Literal,
                    value: '`',
                    raw: '"`"'
                  },
                  right: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                },
                parts: [
                  {
                    type: Syntax.Literal,
                    value: '`',
                    raw: '"`"'
                  },
                  {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                ]
              }
            ]
          }
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'let',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.Identifier,
                    name: 's'
                  },
                  init: {
                    type: Syntax.TemplateLiteral,
                    quasis: [
                      {
                        type: Syntax.TemplateElement,
                        tail: false,
                        value: { cooked: '`', raw: '\\`' }
                      },
                      {
                        type: Syntax.TemplateElement,
                        tail: true,
                        value: { cooked: '', raw: '' }
                      }
                    ],
                    expressions: [
                      {
                        type: Syntax.Identifier,
                        name: 'a'
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('combines a string literal and a non-string expression into a template string', () => {
    check(`
      let s = "foo" + bar;
    `, `
      let s = \`foo\${bar}\`;
    `,
      {
        metadata: {
          'strings.template': {
            concatenations: [
              {
                node: {
                  type: Syntax.BinaryExpression,
                  operator: '+',
                  left: {
                    type: Syntax.Literal,
                    value: 'foo',
                    raw: '"foo"'
                  },
                  right: {
                    type: Syntax.Identifier,
                    name: 'bar'
                  }
                },
                parts: [
                  {
                    type: Syntax.Literal,
                    value: 'foo',
                    raw: '"foo"'
                  },
                  {
                    type: Syntax.Identifier,
                    name: 'bar'
                  }
                ]
              }
            ]
          }
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'let',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.Identifier,
                    name: 's'
                  },
                  init: {
                    type: Syntax.TemplateLiteral,
                    quasis: [
                      {
                        type: Syntax.TemplateElement,
                        tail: false,
                        value: { cooked: 'foo', raw: 'foo' }
                      },
                      {
                        type: Syntax.TemplateElement,
                        tail: true,
                        value: { cooked: '', raw: '' }
                      }
                    ],
                    expressions: [
                      {
                        type: Syntax.Identifier,
                        name: 'bar'
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('combines a string parts and interpolates non-string parts in a template string', () => {
    check(`
      let s = "a" + "b" + c + d + "" + "e" + f;
    `, `
      let s = \`ab\${c}\${d}e\${f}\`;
    `,
      {
        metadata: {
          'strings.template': {
            concatenations: [
              {
                node: {
                  type: Syntax.BinaryExpression,
                  operator: '+',
                  left: {
                    type: Syntax.BinaryExpression,
                    operator: '+',
                    left: {
                      type: Syntax.BinaryExpression,
                      operator: '+',
                      left: {
                        type: Syntax.BinaryExpression,
                        operator: '+',
                        left: {
                          type: Syntax.BinaryExpression,
                          operator: '+',
                          left: {
                            type: Syntax.BinaryExpression,
                            operator: '+',
                            left: {
                              type: Syntax.Literal,
                              value: 'a',
                              raw: '"a"'
                            },
                            right: {
                              type: Syntax.Literal,
                              value: 'b',
                              raw: '"b"'
                            }
                          },
                          right: {
                            type: Syntax.Identifier,
                            name: 'c'
                          }
                        },
                        right: {
                          type: Syntax.Identifier,
                          name: 'd'
                        }
                      },
                      right: {
                        type: Syntax.Literal,
                        value: '',
                        raw: '""'
                      }
                    },
                    right: {
                      type: Syntax.Literal,
                      value: 'e',
                      raw: '"e"'
                    }
                  },
                  right: {
                    type: Syntax.Identifier,
                    name: 'f'
                  }
                },
                parts: [
                  {
                    type: Syntax.Literal,
                    value: 'a',
                    raw: '"a"'
                  },
                  {
                    type: Syntax.Literal,
                    value: 'b',
                    raw: '"b"'
                  },
                  {
                    type: Syntax.Identifier,
                    name: 'c'
                  },
                  {
                    type: Syntax.Identifier,
                    name: 'd'
                  },
                  {
                    type: Syntax.Literal,
                    value: '',
                    raw: '""'
                  },
                  {
                    type: Syntax.Literal,
                    value: 'e',
                    raw: '"e"'
                  },
                  {
                    type: Syntax.Identifier,
                    name: 'f'
                  }
                ]
              }
            ]
          }
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'let',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.Identifier,
                    name: 's'
                  },
                  init: {
                    type: Syntax.TemplateLiteral,
                    quasis: [
                      {
                        type: Syntax.TemplateElement,
                        tail: false,
                        value: { cooked: 'ab', raw: 'ab' }
                      },
                      {
                        type: Syntax.TemplateElement,
                        tail: false,
                        value: { cooked: '', raw: '' }
                      },
                      {
                        type: Syntax.TemplateElement,
                        tail: false,
                        value: { cooked: 'e', raw: 'e' }
                      },
                      {
                        type: Syntax.TemplateElement,
                        tail: true,
                        value: { cooked: '', raw: '' }
                      }
                    ],
                    expressions: [
                      {
                        type: Syntax.Identifier,
                        name: 'c'
                      },
                      {
                        type: Syntax.Identifier,
                        name: 'd'
                      },
                      {
                        type: Syntax.Identifier,
                        name: 'f'
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('handles grouped binary expressions', () => {
    check(`
      let s = "a" + (b + c);
    `, `
      let s = \`a\${b + c}\`;
    `,
      {
        metadata: {
          'strings.template': {
            concatenations: [
              {
                node: {
                  type: Syntax.BinaryExpression,
                  operator: '+',
                  left: {
                    type: Syntax.Literal,
                    value: 'a',
                    raw: '"a"'
                  },
                  right: {
                    type: Syntax.BinaryExpression,
                    operator: '+',
                    left: {
                      type: Syntax.Identifier,
                      name: 'b'
                    },
                    right: {
                      type: Syntax.Identifier,
                      name: 'c'
                    }
                  }
                },
                parts: [
                  {
                    type: Syntax.Literal,
                    value: 'a',
                    raw: '"a"'
                  },
                  {
                    type: Syntax.BinaryExpression,
                    operator: '+',
                    left: {
                      type: Syntax.Identifier,
                      name: 'b'
                    },
                    right: {
                      type: Syntax.Identifier,
                      name: 'c'
                    }
                  }
                ]
              }
            ]
          }
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'let',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.Identifier,
                    name: 's'
                  },
                  init: {
                    type: Syntax.TemplateLiteral,
                    quasis: [
                      {
                        type: Syntax.TemplateElement,
                        tail: false,
                        value: { cooked: 'a', raw: 'a' }
                      },
                      {
                        type: Syntax.TemplateElement,
                        tail: true,
                        value: { cooked: '', raw: '' }
                      }
                    ],
                    expressions: [
                      {
                        type: Syntax.BinaryExpression,
                        operator: '+',
                        left: {
                          type: Syntax.Identifier,
                          name: 'b'
                        },
                        right: {
                          type: Syntax.Identifier,
                          name: 'c'
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });
});
