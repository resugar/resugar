import check from './support/check';
import { Syntax } from 'estraverse';

describe('Object Destructuring Plugin test', () => {
  it('converts member access with property name matching binding name to destructuring', () => {
    check(`
      const a = obj.a;
    `, `
      const { a } = obj;
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'a'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                }
              ]
            }
          ]
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'const',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        value: {
                          type: Syntax.Identifier,
                          name: 'a'
                        },
                        key: {
                          type: Syntax.Identifier,
                          name: 'a'
                        }
                      }
                    ]
                  },
                  init: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('collapses multiple declarators with the same member access base', () => {
    check(`
      const a = obj.a, b = obj.b;
    `, `
      const { a, b } = obj;
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'a'
                },
                {
                  type: Syntax.Identifier,
                  name: 'b'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                },
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'b'
                  }
                }
              ]
            }
          ]
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'const',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        value: {
                          type: Syntax.Identifier,
                          name: 'a'
                        },
                        key: {
                          type: Syntax.Identifier,
                          name: 'a'
                        }
                      },
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        value: {
                          type: Syntax.Identifier,
                          name: 'b'
                        },
                        key: {
                          type: Syntax.Identifier,
                          name: 'b'
                        }
                      }
                    ]
                  },
                  init: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('does not collapse multiple declarators when the member objects do not match', () => {
    check(`
      const a = foo.a, b = bar.b;
    `, `
      const { a } = foo, { b } = bar;
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'a'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'foo'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                }
              ]
            },
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'b'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'bar'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'b'
                  }
                }
              ]
            }
          ]
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'const',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
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
                  },
                  init: {
                    type: Syntax.Identifier,
                    name: 'foo'
                  }
                },
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        key: {
                          type: Syntax.Identifier,
                          name: 'b'
                        },
                        value: {
                          type: Syntax.Identifier,
                          name: 'b'
                        }
                      }
                    ]
                  },
                  init: {
                    type: Syntax.Identifier,
                    name: 'bar'
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('does not convert computed properties', () => {
    check(`
      const a = b[a];
    `, `
      const a = b[a];
    `);
  });

  it('does not consolidate multiple unsafe-to-consolidate member objects', () => {
    check(`
      const a = foo().a, b = foo().b;
    `, `
      const { a } = foo(), { b } = foo();
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'a'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.CallExpression,
                    callee: {
                      type: Syntax.Identifier,
                      name: 'foo'
                    },
                    arguments: []
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                }
              ]
            },
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'b'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.CallExpression,
                    callee: {
                      type: Syntax.Identifier,
                      name: 'foo'
                    },
                    arguments: []
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'b'
                  }
                }
              ]
            }
          ]
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'const',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
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
                  },
                  init: {
                    type: Syntax.CallExpression,
                    callee: {
                      type: Syntax.Identifier,
                      name: 'foo'
                    },
                    arguments: []
                  }
                },
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        key: {
                          type: Syntax.Identifier,
                          name: 'b'
                        },
                        value: {
                          type: Syntax.Identifier,
                          name: 'b'
                        }
                      }
                    ]
                  },
                  init: {
                    type: Syntax.CallExpression,
                    callee: {
                      type: Syntax.Identifier,
                      name: 'foo'
                    },
                    arguments: []
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('consolidates multiple groups of declarators', () => {
    check(`
      const a = obj.a, b = obj.b, c = obj2.c, d = obj2.d;
    `, `
      const { a, b } = obj, { c, d } = obj2;
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'a'
                },
                {
                  type: Syntax.Identifier,
                  name: 'b'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                },
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'b'
                  }
                }
              ]
            },
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'c'
                },
                {
                  type: Syntax.Identifier,
                  name: 'd'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj2'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'c'
                  }
                },
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj2'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'd'
                  }
                }
              ]
            }
          ]
        },
        ast: {
          type: Syntax.Program,
          sourceType: 'module',
          body: [
            {
              type: Syntax.VariableDeclaration,
              kind: 'const',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
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
                      },
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        key: {
                          type: Syntax.Identifier,
                          name: 'b'
                        },
                        value: {
                          type: Syntax.Identifier,
                          name: 'b'
                        }
                      }
                    ]
                  },
                  init: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  }
                },
                {
                  type: Syntax.VariableDeclarator,
                  id: {
                    type: Syntax.ObjectPattern,
                    properties: [
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        key: {
                          type: Syntax.Identifier,
                          name: 'c'
                        },
                        value: {
                          type: Syntax.Identifier,
                          name: 'c'
                        }
                      },
                      {
                        type: Syntax.Property,
                        computed: false,
                        shorthand: true,
                        method: false,
                        key: {
                          type: Syntax.Identifier,
                          name: 'd'
                        },
                        value: {
                          type: Syntax.Identifier,
                          name: 'd'
                        }
                      }
                    ]
                  },
                  init: {
                    type: Syntax.Identifier,
                    name: 'obj2'
                  }
                }
              ]
            }
          ]
        }
      }
    );
  });

  it('transforms standalone assignments into destructuring assignment', () => {
    check(`
      a = obj.a;
    `, `
      ({ a } = obj);
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'a'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                }
              ]
            }
          ]
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
                  type: Syntax.ObjectPattern,
                  properties: [
                    {
                      type: Syntax.Property,
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
                },
                right: {
                  type: Syntax.Identifier,
                  name: 'obj'
                }
              }
            }
          ]
        }
      }
    );
  });

  it('consolidates sequences of assignments into destructuring as appropriate', () => {
    check(`
      a = obj.a, b = obj.b;
    `, `
      ({ a, b } = obj);
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'a'
                },
                {
                  type: Syntax.Identifier,
                  name: 'b'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                },
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'b'
                  }
                }
              ]
            }
          ]
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
                  type: Syntax.ObjectPattern,
                  properties: [
                    {
                      type: Syntax.Property,
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
                    },
                    {
                      type: Syntax.Property,
                      computed: false,
                      shorthand: true,
                      method: false,
                      key: {
                        type: Syntax.Identifier,
                        name: 'b'
                      },
                      value: {
                        type: Syntax.Identifier,
                        name: 'b'
                      }
                    }
                  ]
                },
                right: {
                  type: Syntax.Identifier,
                  name: 'obj'
                }
              }
            }
          ]
        }
      }
    );
  });

  it('does not add parentheses when the assignment is not in an expression statement', () => {
    check(`
      a(b = obj.b);
    `, `
      a({ b } = obj);
    `,
      {
        metadata: {
          'objects.destructuring': [
            {
              ids: [
                {
                  type: Syntax.Identifier,
                  name: 'b'
                }
              ],
              inits: [
                {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'obj'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'b'
                  }
                }
              ]
            }
          ]
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
                    type: Syntax.AssignmentExpression,
                    operator: '=',
                    left: {
                      type: Syntax.ObjectPattern,
                      properties: [
                        {
                          type: Syntax.Property,
                          computed: false,
                          method: false,
                          shorthand: true,
                          key: {
                            type: Syntax.Identifier,
                            name: 'b'
                          },
                          value: {
                            type: Syntax.Identifier,
                            name: 'b'
                          }
                        }
                      ]
                    },
                    right: {
                      type: Syntax.Identifier,
                      name: 'obj'
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

  it('does not rewrite assignments with a LHS member expression', () => {
    check(`
      opts.path = opts.pathname;
    `, `
      opts.path = opts.pathname;
    `);
  });

  it('does not rewrite assignments whose binding does not match the property name', () => {
    check(`
      opts = config.options;
    `, `
      opts = config.options;
    `);
  });
});
