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
