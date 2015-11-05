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
                  declarations: [
                    {
                      type: Syntax.VariableDeclarator,
                      id: {
                        type: Syntax.Identifier,
                        name: 'foo',
                        range: [ 5, 8 ]
                      },
                      init: {
                        type: Syntax.CallExpression,
                        arguments: [
                          {
                            type: Syntax.Literal,
                            value: 'foo',
                            raw: `'foo'`,
                            range: [ 19, 24 ]
                          }
                        ],
                        callee: {
                          type: Syntax.Identifier,
                          name: 'require',
                          range: [ 11, 18 ]
                        },
                        range: [ 11, 25 ]
                      },
                      range: [ 5, 25 ]
                    }
                  ],
                  kind: 'var',
                  range: [ 1, 26 ]
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
                  declarations: [
                    {
                      type: 'VariableDeclarator',
                      id: {
                        'type': 'Identifier',
                        name: 'parse',
                        range: [ 5, 10 ]
                      },
                      init: {
                        type: 'MemberExpression',
                        computed: false,
                        object: {
                          type: 'CallExpression',
                          arguments: [
                            {
                              type: 'Literal',
                              range: [ 21, 29 ],
                              value: 'espree',
                              raw: `'espree'`
                            }
                          ],
                          callee: {
                            type: 'Identifier',
                            name: 'require',
                            range: [ 13, 20 ]
                          },
                          range: [ 13, 30 ]
                        },
                        property: {
                          type: 'Identifier',
                          name: 'parse',
                          range: [ 31, 36 ]
                        },
                        range: [ 13, 36 ]
                      },
                      range: [ 5, 36 ]
                    }
                  ],
                  kind: 'var',
                  range: [ 1, 37 ]
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
                              name: 'pow',
                              range: [ 7, 10 ]
                            },
                            value: {
                              type: 'Identifier',
                              name: 'pow',
                              range: [ 7, 10 ]
                            },
                            kind: 'init',
                            computed: false,
                            method: false,
                            shorthand: true,
                            range: [ 7, 10 ]
                          },
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'sin',
                              range: [ 12, 15 ]
                            },
                            value: {
                              type: 'Identifier',
                              name: 'sin',
                              range: [ 12, 15 ]
                            },
                            kind: 'init',
                            computed: false,
                            method: false,
                            shorthand: true,
                            range: [ 12, 15 ]
                          },
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'cos',
                              range: [ 17, 20 ]
                            },
                            value: {
                              type: 'Identifier',
                              name: 'cosine',
                              range: [ 22, 28 ]
                            },
                            kind: 'init',
                            computed: false,
                            method: false,
                            shorthand: false,
                            range: [ 17, 28 ]
                          }
                        ],
                        range: [ 5, 30 ]
                      },
                      init: {
                        type: 'CallExpression',
                        arguments: [
                          {
                            type: 'Literal',
                            value: 'math',
                            raw: `'math'`,
                            range: [ 41, 47 ]
                          }
                        ],
                        callee: {
                          type: 'Identifier',
                          name: 'require',
                          range: [ 33, 40 ]
                        },
                        range: [ 33, 48 ]
                      },
                      range: [ 5, 48 ]
                    }
                  ],
                  range: [ 1, 49 ]
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
                        raw: `'foo'`,
                        range: [ 9, 14 ]
                      }
                    ],
                    callee: {
                      type: 'Identifier',
                      name: 'require',
                      range: [ 1, 8 ]
                    },
                    range: [ 1, 15 ]
                  },
                  range: [ 1, 16 ]
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
            type: 'unsupported-require',
            message: `Unsupported 'require' call cannot be transformed to an import`,
            node: {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: 'require', range: [ 1, 8 ] },
              arguments: [
                {
                  type: 'Literal',
                  value: 'debug',
                  raw: `'debug'`,
                  range: [ 9, 16 ]
                }
              ],
              range: [ 1, 17 ]
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
      var foo = function() {
        require('foo');
      };
    `, `
      var foo = function() {
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
                        name: 'exports',
                        range: [ 1, 8 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'add',
                        range: [ 9, 12 ]
                      },
                      range: [ 1, 12 ]
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
                                name: 'a',
                                range: [ 41, 42 ]
                              },
                              right: {
                                type: 'Identifier',
                                name: 'b',
                                range: [ 45, 46 ]
                              },
                              range: [ 41, 46 ]
                            },
                            range: [ 34, 47 ]
                          }
                        ],
                        range: [ 30, 49 ]
                      },
                      expression: false,
                      generator: false,
                      id: null,
                      params: [
                        {
                          type: 'Identifier',
                          name: 'a',
                          range: [ 24, 25 ]
                        },
                        {
                          type: 'Identifier',
                          name: 'b',
                          range: [ 27, 28 ]
                        }
                      ],
                      range: [ 15, 49 ]
                    },
                    range: [ 1, 49 ]
                  },
                  range: [ 1, 50 ]
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
                        name: 'exports',
                        range: [ 1, 8 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'add',
                        range: [ 9, 12 ]
                      },
                      range: [ 1, 12 ]
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
                                name: 'a',
                                range: [ 45, 46 ]
                              },
                              right: {
                                type: 'Identifier',
                                name: 'b',
                                range: [ 49, 50 ]
                              },
                              range: [ 45, 50 ]
                            },
                            range: [ 38, 51 ]
                          }
                        ],
                        range: [ 34, 53 ]
                      },
                      expression: false,
                      generator: false,
                      id: {
                        type: 'Identifier',
                        name: 'add',
                        range: [ 24, 27 ]
                      },
                      params: [
                        {
                          type: 'Identifier',
                          name: 'a',
                          range: [ 28, 29 ]
                        },
                        {
                          type: 'Identifier',
                          name: 'b',
                          range: [ 31, 32 ]
                        }
                      ],
                      range: [ 15, 53 ]
                    },
                    range: [ 1, 53 ]
                  },
                  range: [ 1, 54 ]
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
              name: 'doSomething',
              range: [ 24, 35 ]
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
                        name: 'exports',
                        range: [ 1, 8 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'add',
                        range: [ 9, 12 ]
                      },
                      range: [ 1, 12 ]
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
                                name: 'a',
                                range: [ 53, 54 ]
                              },
                              right: {
                                type: 'Identifier',
                                name: 'b',
                                range: [ 57, 58 ]
                              },
                              range: [ 53, 58 ]
                            },
                            range: [ 46, 59 ]
                          }
                        ],
                        range: [ 42, 61 ]
                      },
                      expression: false,
                      generator: false,
                      id: {
                        type: 'Identifier',
                        name: 'doSomething',
                        range: [ 24, 35 ]
                      },
                      params: [
                        {
                          type: 'Identifier',
                          name: 'a',
                          range: [ 36, 37 ]
                        },
                        {
                          type: 'Identifier',
                          name: 'b',
                          range: [ 39, 40 ]
                        }
                      ],
                      range: [ 15, 61 ]
                    },
                    range: [ 1, 61 ]
                  },
                  range: [ 1, 62 ]
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
                        name: 'exports',
                        range: [ 1, 8 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'foo',
                        range: [ 9, 12 ]
                      },
                      range: [ 1, 12 ]
                    },
                    right: {
                      type: 'FunctionExpression',
                      body: {
                        type: 'BlockStatement',
                        body: [],
                        range: [ 26, 28 ]
                      },
                      expression: false,
                      generator: false,
                      id: null,
                      params: [],
                      range: [ 15, 28 ]
                    },
                    range: [ 1, 28 ]
                  },
                  range: [ 1, 29 ]
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
                        name: 'exports',
                        range: [ 1, 8 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'foo',
                        range: [ 9, 12 ]
                      },
                      range: [ 1, 12 ]
                    },
                    right: {
                      type: 'FunctionExpression',
                      body: {
                        type: 'BlockStatement',
                        body: [],
                        range: [ 26, 28 ]
                      },
                      expression: false,
                      generator: false,
                      id: null,
                      params: [],
                      range: [ 15, 28 ]
                    },
                    range: [ 1, 28 ]
                  },
                  range: [ 1, 33 ]
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
                        name: 'exports',
                        range: [ 1, 8 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'PI',
                        range: [ 9, 11 ]
                      },
                      range: [ 1, 11 ]
                    },
                    right: {
                      type: 'Literal',
                      value: 3.14,
                      raw: '3.14',
                      range: [ 14, 18 ]
                    },
                    range: [ 1, 18 ]
                  },
                  range: [ 1, 19 ]
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
                        name: 'module',
                        range: [ 1, 7 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'exports',
                        range: [ 8, 15 ]
                      },
                      range: [ 1, 15 ]
                    },
                    right: {
                      type: 'Identifier',
                      name: 'Foo',
                      range: [ 18, 21 ]
                    },
                    range: [ 1, 21 ]
                  },
                  range: [ 1, 22 ]
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
      var a;
      exports.a = 1;
    `, `
      var a;
      export let a = 1;
    `,
      {
        warnings: [
          {
            type: 'named-export-conflicts-with-local-binding',
            message: `Named export 'a' conflicts with existing local binding`,
            node: {
              type: 'Identifier',
              name: 'a',
              range: [ 16, 17 ]
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
                        name: 'exports',
                        range: [ 8, 15 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'a',
                        range: [ 16, 17 ]
                      },
                      range: [ 8, 17 ]
                    },
                    right: {
                      type: 'Literal',
                      value: 1,
                      raw: '1',
                      range: [ 20, 21 ]
                    },
                    range: [ 8, 21 ]
                  },
                  range: [ 8, 22 ]
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
      var a = 1;
      exports.a = a;
    `, `
      var a = 1;
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
                        name: 'exports',
                        range: [ 12, 19 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'a',
                        range: [ 20, 21 ]
                      },
                      range: [ 12, 21 ]
                    },
                    right: {
                      type: 'Identifier',
                      name: 'a',
                      range: [ 24, 25 ]
                    },
                    range: [ 12, 25 ]
                  },
                  range: [ 12, 26 ]
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
      var a = 1;
      exports.b = a;
    `, `
      var a = 1;
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
                        name: 'exports',
                        range: [ 12, 19 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'b',
                        range: [ 20, 21 ]
                      },
                      range: [ 12, 21 ]
                    },
                    right: {
                      type: 'Identifier',
                      name: 'a',
                      range: [ 24, 25 ]
                    },
                    range: [ 12, 25 ]
                  },
                  range: [ 12, 26 ]
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
                        name: 'module',
                        range: [ 1, 7 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'exports',
                        range: [ 8, 15 ]
                      },
                      range: [ 1, 15 ]
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
                            name: 'a',
                            range: [ 20, 21 ]
                          },
                          value: {
                            type: 'Identifier',
                            name: 'a',
                            range: [ 20, 21 ]
                          },
                          range: [ 20, 21 ]
                        },
                        {
                          type: 'Property',
                          computed: false,
                          kind: 'init',
                          method: false,
                          shorthand: true,
                          key: {
                            type: 'Identifier',
                            name: 'b',
                            range: [ 23, 24 ]
                          },
                          value: {
                            type: 'Identifier',
                            name: 'b',
                            range: [ 23, 24 ]
                          },
                          range: [ 23, 24 ]
                        }
                      ],
                      range: [ 18, 26 ]
                    },
                    range: [ 1, 26 ]
                  },
                  range: [ 1, 27 ]
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
                        name: 'module',
                        range: [ 1, 7 ]
                      },
                      property: {
                        type: 'Identifier',
                        name: 'exports',
                        range: [ 8, 15 ]
                      },
                      range: [ 1, 15 ]
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
                            name: 'a',
                            range: [ 20, 21 ]
                          },
                          value: {
                            type: 'Identifier',
                            name: 'b',
                            range: [ 23, 24 ]
                          },
                          range: [ 20, 24 ]
                        },
                        {
                          type: 'Property',
                          computed: false,
                          kind: 'init',
                          method: false,
                          shorthand: false,
                          key: {
                            type: 'Identifier',
                            name: 'c',
                            range: [ 26, 27 ]
                          },
                          value: {
                            type: 'Identifier',
                            name: 'd',
                            range: [ 29, 30 ]
                          },
                          range: [ 26, 30 ]
                        }
                      ],
                      range: [ 18, 32 ]
                    },
                    range: [ 1, 32 ]
                  },
                  range: [ 1, 33 ]
                }
              }
            ],
            directives: []
          }
        }
      }
    );
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
                    raw: '"use strict"',
                    range: [ 1, 13 ]
                  },
                  range: [ 1, 14 ]
                }
              }
            ]
          }
        }
      }
    );
  });
});