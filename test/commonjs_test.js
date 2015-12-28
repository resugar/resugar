import check from './support/check';
import { Syntax } from 'estraverse';

describe('CommonJS module plugin', () => {
  it('rewrites whole module `require` calls as default imports', () => {
    check(`
      var foo = require('foo');
    `, `
      import foo from 'foo';
    `,
      {
        metadata: {
          'modules.commonjs': {
            exports: [],
            imports: [
              {
                type: 'default-import',
                path: 'foo',
                bindings: [
                  {
                    localName: 'foo',
                    exportName: 'default'
                  }
                ],
                node: {
                  type: Syntax.VariableDeclaration,
                  kind: 'var',
                  declarations: [
                    {
                      type: Syntax.VariableDeclarator,
                      id: {
                        type: Syntax.Identifier,
                        name: 'foo'
                      },
                      init: {
                        type: Syntax.CallExpression,
                        arguments: [
                          {
                            type: Syntax.Literal,
                            value: 'foo',
                            raw: `'foo'`
                          }
                        ],
                        callee: {
                          type: Syntax.Identifier,
                          name: 'require'
                        }
                      }
                    }
                  ]
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('turns top-level `require` calls accessing a static property with strings assigned to a variable into imports', () => {
    check(`
      var parse = require('espree').parse;
    `, `
      import { parse } from 'espree';
    `,
      {
        metadata: {
          'modules.commonjs': {
            exports: [],
            imports: [
              {
                type: 'named-import',
                path: 'espree',
                bindings: [
                  {
                    exportName: 'parse',
                    localName: 'parse'
                  }
                ],
                node: {
                  type: 'VariableDeclaration',
                  kind: 'var',
                  declarations: [
                    {
                      type: 'VariableDeclarator',
                      id: {
                        'type': 'Identifier',
                        name: 'parse'
                      },
                      init: {
                        type: 'MemberExpression',
                        computed: false,
                        object: {
                          type: 'CallExpression',
                          arguments: [
                            {
                              type: 'Literal',
                              value: 'espree',
                              raw: `'espree'`
                            }
                          ],
                          callee: {
                            type: 'Identifier',
                            name: 'require'
                          }
                        },
                        property: {
                          type: 'Identifier',
                          name: 'parse'
                        }
                      }
                    }
                  ]
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('turns top-level `require` calls with deconstructing assigning into named imports', () => {
    check(`
      var { pow, sin, cos: cosine } = require('math');
    `, `
      import { pow, sin, cos as cosine } from 'math';
    `,
      {
        metadata: {
          'modules.commonjs': {
            exports: [],
            imports: [
              {
                type: 'named-import',
                path: 'math',
                bindings: [
                  {
                    exportName: 'pow',
                    localName: 'pow'
                  },
                  {
                    exportName: 'sin',
                    localName: 'sin'
                  },
                  {
                    exportName: 'cos',
                    localName: 'cosine'
                  }
                ],
                node: {
                  type: 'VariableDeclaration',
                  kind: 'var',
                  declarations: [
                    {
                      type: 'VariableDeclarator',
                      id: {
                        type: 'ObjectPattern',
                        properties: [
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'pow'
                            },
                            value: {
                              type: 'Identifier',
                              name: 'pow'
                            },
                            kind: 'init',
                            computed: false,
                            method: false,
                            shorthand: true
                          },
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'sin'
                            },
                            value: {
                              type: 'Identifier',
                              name: 'sin'
                            },
                            kind: 'init',
                            computed: false,
                            method: false,
                            shorthand: true
                          },
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'cos'
                            },
                            value: {
                              type: 'Identifier',
                              name: 'cosine'
                            },
                            kind: 'init',
                            computed: false,
                            method: false,
                            shorthand: false
                          }
                        ]
                      },
                      init: {
                        type: 'CallExpression',
                        arguments: [
                          {
                            type: 'Literal',
                            value: 'math',
                            raw: `'math'`
                          }
                        ],
                        callee: {
                          type: 'Identifier',
                          name: 'require'
                        }
                      }
                    }
                  ]
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('turns top-level `require` calls without a binding to an import', () => {
    check(`
      require('foo');
    `, `
      import 'foo';
    `,
      {
        metadata: {
          'modules.commonjs': {
            exports: [],
            imports: [
              {
                type: 'bare-import',
                path: 'foo',
                bindings: [],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'CallExpression',
                    arguments: [
                      {
                        type: 'Literal',
                        value: 'foo',
                        raw: `'foo'`
                      }
                    ],
                    callee: {
                      type: 'Identifier',
                      name: 'require'
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('warns about top-level `require` calls not fitting a known pattern', () => {
    check(`
      require('debug')('mocha:debug');
    `, `
      require('debug')('mocha:debug');
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [],
            directives: []
          }
        },
        warnings: [
          {
            type: 'unsupported-import',
            message: `Unsupported 'require' call cannot be transformed to an import`,
            node: {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: 'require' },
              arguments: [
                {
                  type: 'Literal',
                  value: 'debug',
                  raw: `'debug'`
                }
              ]
            }
          }
        ]
      }
    );
  });

  it('ignores `require` calls in function declarations', () => {
    check(`
      function foo() {
        require('foo');
      }
    `, `
      function foo() {
        require('foo');
      }
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [],
            directives: []
          }
        }
      }
    );
  });

  it('ignores `require` calls in function expressions', () => {
    check(`
      let foo = function() {
        require('foo');
      };
    `, `
      let foo = function() {
        require('foo');
      };
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [],
            directives: []
          }
        }
      }
    );
  });

  it('adds a name to exported anonymous functions', () => {
    check(`
      exports.add = function(a, b) {
        return a + b;
      };
    `, `
      export function add(a, b) {
        return a + b;
      }
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                bindings: [
                  {
                    exportName: 'add',
                    localName: 'add'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'add'
                      }
                    },
                    operator: '=',
                    right: {
                      type: 'FunctionExpression',
                      body: {
                        type: 'BlockStatement',
                        body: [
                          {
                            type: 'ReturnStatement',
                            argument: {
                              type: 'BinaryExpression',
                              operator: '+',
                              left: {
                                type: 'Identifier',
                                name: 'a'
                              },
                              right: {
                                type: 'Identifier',
                                name: 'b'
                              }
                            }
                          }
                        ]
                      },
                      expression: false,
                      generator: false,
                      id: null,
                      params: [
                        {
                          type: 'Identifier',
                          name: 'a'
                        },
                        {
                          type: 'Identifier',
                          name: 'b'
                        }
                      ]
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('does not add a name to an exported named function when the name matches the export name', () => {
    check(`
      exports.add = function add(a, b) {
        return a + b;
      };
    `, `
      export function add(a, b) {
        return a + b;
      }
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                bindings: [
                  {
                    exportName: 'add',
                    localName: 'add'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'add'
                      }
                    },
                    right: {
                      type: 'FunctionExpression',
                      body: {
                        type: 'BlockStatement',
                        body: [
                          {
                            type: 'ReturnStatement',
                            argument: {
                              type: 'BinaryExpression',
                              operator: '+',
                              left: {
                                type: 'Identifier',
                                name: 'a'
                              },
                              right: {
                                type: 'Identifier',
                                name: 'b'
                              }
                            }
                          }
                        ]
                      },
                      expression: false,
                      generator: false,
                      id: {
                        type: 'Identifier',
                        name: 'add'
                      },
                      params: [
                        {
                          type: 'Identifier',
                          name: 'a'
                        },
                        {
                          type: 'Identifier',
                          name: 'b'
                        }
                      ]
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('issues a warning when the exported name and the function name do not match', () => {
    check(`
      exports.add = function doSomething(a, b) {
        return a + b;
      };
    `, `
      export function add(a, b) {
        return a + b;
      }
    `,
      {
        warnings: [
          {
            type: 'export-function-name-mismatch',
            message: `Exported function 'doSomething' does not match export name 'add'`,
            node: {
              type: 'Identifier',
              name: 'doSomething'
            }
          }
        ],
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                bindings: [
                  {
                    exportName: 'add',
                    localName: 'doSomething'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'add'
                      }
                    },
                    right: {
                      type: 'FunctionExpression',
                      body: {
                        type: 'BlockStatement',
                        body: [
                          {
                            type: 'ReturnStatement',
                            argument: {
                              type: 'BinaryExpression',
                              operator: '+',
                              left: {
                                type: 'Identifier',
                                name: 'a'
                              },
                              right: {
                                type: 'Identifier',
                                name: 'b'
                              }
                            }
                          }
                        ]
                      },
                      expression: false,
                      generator: false,
                      id: {
                        type: 'Identifier',
                        name: 'doSomething'
                      },
                      params: [
                        {
                          type: 'Identifier',
                          name: 'a'
                        },
                        {
                          type: 'Identifier',
                          name: 'b'
                        }
                      ]
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('removes the semi-colon when changing an export from an assignment to `export function`', () => {
    check(`
      exports.foo = function() {};
    `, `
      export function foo() {}
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                bindings: [
                  {
                    exportName: 'foo',
                    localName: 'foo'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'foo'
                      }
                    },
                    right: {
                      type: 'FunctionExpression',
                      body: {
                        type: 'BlockStatement',
                        body: []
                      },
                      expression: false,
                      generator: false,
                      id: null,
                      params: []
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('ignores a missing semi-colon when changing an export from an assignment to `export function`', () => {
    check(`
      exports.foo = function() {}
    `, `
      export function foo() {}
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                bindings: [
                  {
                    exportName: 'foo',
                    localName: 'foo'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'foo'
                      }
                    },
                    right: {
                      type: 'FunctionExpression',
                      body: {
                        type: 'BlockStatement',
                        body: []
                      },
                      expression: false,
                      generator: false,
                      id: null,
                      params: []
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('exports non-function values as `export let`', () => {
    check(`
      exports.PI = 3.14;
    `, `
      export let PI = 3.14;
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                type: 'named-export',
                bindings: [
                  {
                    exportName: 'PI',
                    localName: 'PI'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'PI'
                      }
                    },
                    right: {
                      type: 'Literal',
                      value: 3.14,
                      raw: '3.14'
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('changes setting `module.exports` to `export default`', () => {
    check(`
      module.exports = Foo;
    `, `
      export default Foo;
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                type: 'default-export',
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'module'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'exports'
                      }
                    },
                    right: {
                      type: 'Identifier',
                      name: 'Foo'
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('issues a warning when rewriting a non-function export would duplicate a local binding', () => {
    check(`
      let a;
      exports.a = 1;
    `, `
      let a;
      export let a = 1;
    `,
      {
        warnings: [
          {
            type: 'named-export-conflicts-with-local-binding',
            message: `Named export 'a' conflicts with existing local binding`,
            node: {
              type: 'Identifier',
              name: 'a'
            }
          }
        ],
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                type: 'named-export',
                bindings: [
                  {
                    exportName: 'a',
                    localName: 'a'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'a'
                      }
                    },
                    right: {
                      type: 'Literal',
                      value: 1,
                      raw: '1'
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('uses shorthand export when the exported value is an identifier matching the export name', () => {
    check(`
      let a = 1;
      exports.a = a;
    `, `
      let a = 1;
      export { a };
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                type: 'named-export',
                bindings: [
                  {
                    exportName: 'a',
                    localName: 'a'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'a'
                      }
                    },
                    right: {
                      type: 'Identifier',
                      name: 'a'
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('uses shorthand export with an alias when the exported value is an identifier not matching the export name', () => {
    check(`
      let a = 1;
      exports.b = a;
    `, `
      let a = 1;
      export { a as b };
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                type: 'named-export',
                bindings: [
                  {
                    exportName: 'b',
                    localName: 'a'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'exports'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'b'
                      }
                    },
                    right: {
                      type: 'Identifier',
                      name: 'a'
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('rewrites assigning an object with shorthand properties to `module.exports` as named exports', () => {
    check(`
      module.exports = { a, b };
    `, `
      export { a, b };
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                type: 'named-export',
                bindings: [
                  {
                    exportName: 'a',
                    localName: 'a'
                  },
                  {
                    exportName: 'b',
                    localName: 'b'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'module'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'exports'
                      }
                    },
                    right: {
                      type: 'ObjectExpression',
                      properties: [
                        {
                          type: 'Property',
                          computed: false,
                          kind: 'init',
                          method: false,
                          shorthand: true,
                          key: {
                            type: 'Identifier',
                            name: 'a'
                          },
                          value: {
                            type: 'Identifier',
                            name: 'a'
                          }
                        },
                        {
                          type: 'Property',
                          computed: false,
                          kind: 'init',
                          method: false,
                          shorthand: true,
                          key: {
                            type: 'Identifier',
                            name: 'b'
                          },
                          value: {
                            type: 'Identifier',
                            name: 'b'
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('rewrites assigning an object with simple properties to `module.exports` as named exports', () => {
    check(`
      module.exports = { a: b, c: d };
    `, `
      export { b as a, d as c };
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [
              {
                type: 'named-export',
                bindings: [
                  {
                    exportName: 'a',
                    localName: 'b'
                  },
                  {
                    exportName: 'c',
                    localName: 'd'
                  }
                ],
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: {
                        type: 'Identifier',
                        name: 'module'
                      },
                      property: {
                        type: 'Identifier',
                        name: 'exports'
                      }
                    },
                    right: {
                      type: 'ObjectExpression',
                      properties: [
                        {
                          type: 'Property',
                          computed: false,
                          kind: 'init',
                          method: false,
                          shorthand: false,
                          key: {
                            type: 'Identifier',
                            name: 'a'
                          },
                          value: {
                            type: 'Identifier',
                            name: 'b'
                          }
                        },
                        {
                          type: 'Property',
                          computed: false,
                          kind: 'init',
                          method: false,
                          shorthand: false,
                          key: {
                            type: 'Identifier',
                            name: 'c'
                          },
                          value: {
                            type: 'Identifier',
                            name: 'd'
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ],
            directives: []
          }
        }
      }
    );
  });

  it('rewrites assignment to a static property of `module.exports` as a named export', () => {
    check(`
      module.exports.a = a;
    `, `
      export { a };
    `);
  });

  it('removes a "use strict" directive from the top of the global scope', () => {
    check(`
      "use strict";
      foo();
    `, `
      foo();
    `,
      {
        metadata: {
          'modules.commonjs': {
            imports: [],
            exports: [],
            directives: [
              {
                type: 'removed-strict-mode',
                node: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'Literal',
                    value: 'use strict',
                    raw: '"use strict"'
                  }
                }
              }
            ]
          }
        }
      }
    );
  });

  it('warns when export statements are not at the top level', () => {
    check(`
      if (a === b) {
        exports.a = a;
      }
    `, `
      if (a === b) {
        exports.a = a;
      }
    `,
      {
        warnings: [
          {
            type: 'unsupported-export',
            message: `Unsupported export cannot be turned into an 'export' statement`,
            node: {
              type: Syntax.ExpressionStatement,
              expression: {
                type: Syntax.AssignmentExpression,
                operator: '=',
                left: {
                  type: Syntax.MemberExpression,
                  computed: false,
                  object: {
                    type: Syntax.Identifier,
                    name: 'exports'
                  },
                  property: {
                    type: Syntax.Identifier,
                    name: 'a'
                  }
                },
                right: {
                  type: Syntax.Identifier,
                  name: 'a'
                }
              }
            }
          }
        ]
      }
    );
  });

  it('warns when would-be import statements are not at the top level', () => {
    check(`
      if (a === b) {
        require('assert');
      }
    `, `
      if (a === b) {
        require('assert');
      }
    `,
      {
        warnings: [
          {
            type: 'unsupported-import',
            message: `Unsupported 'require' call cannot be transformed to an import`,
            node: {
              type: Syntax.CallExpression,
              callee: {
                type: Syntax.Identifier,
                name: 'require'
              },
              arguments: [
                {
                  type: Syntax.Literal,
                  value: 'assert',
                  raw: `'assert'`
                }
              ]
            }
          }
        ]
      }
    );
  });
});