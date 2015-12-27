import check from './support/check';
import { Syntax } from 'estraverse';

describe('Block Scope plugin', () => {
  it('rewrites `var` to `let` when there is no initializer', () => {
    check(`
      var a;
    `, `
      let a;
    `,
      {
        metadata: {
          'declarations.block-scope': {
            declarations: [
              {
                type: Syntax.VariableDeclaration,
                kind: 'var',
                declarations: [
                  {
                    type: Syntax.VariableDeclarator,
                    id: { type: Syntax.Identifier, name: 'a' },
                    init: null
                  }
                ]
              }
            ]
          }
        }
      }
    );
  });

  it('rewrites `var` to `const` when there is only an initialization and no reassignments', () => {
    check(`
      var a = 1;
    `, `
      const a = 1;
    `,
      {
        metadata: {
          'declarations.block-scope': {
            declarations: [
              {
                type: Syntax.VariableDeclaration,
                kind: 'var',
                declarations: [
                  {
                    type: Syntax.VariableDeclarator,
                    id: { type: Syntax.Identifier, name: 'a' },
                    init: { type: Syntax.Literal, value: 1, raw: '1' }
                  }
                ]
              }
            ]
          }
        }
      }
    );
  });

  it('converts `var` to `let` when a binding is reassigned using compound assignment', () => {
    check(`
      var a = 1;
      a += 2;
    `, `
      let a = 1;
      a += 2;
    `,
      {
        metadata: {
          'declarations.block-scope': {
            declarations: [
              {
                type: Syntax.VariableDeclaration,
                kind: 'var',
                declarations: [
                  {
                    type: Syntax.VariableDeclarator,
                    id: { type: Syntax.Identifier, name: 'a' },
                    init: { type: Syntax.Literal, value: 1, raw: '1' }
                  }
                ]
              }
            ]
          }
        }
      }
    );
  });

  it('converts `var` to `let` when some but not all bindings on the declaration could be `const`', () => {
    check(`
      var a = 1, b = 2;
      a++;
    `, `
      let a = 1, b = 2;
      a++;
    `,
      {
        metadata: {
          'declarations.block-scope': {
            declarations: [
              {
                type: Syntax.VariableDeclaration,
                kind: 'var',
                declarations: [
                  {
                    type: Syntax.VariableDeclarator,
                    id: { type: Syntax.Identifier, name: 'a' },
                    init: { type: Syntax.Literal, value: 1, raw: '1' }
                  },
                  {
                    type: Syntax.VariableDeclarator,
                    id: { type: Syntax.Identifier, name: 'b' },
                    init: { type: Syntax.Literal, value: 2, raw: '2' }
                  }
                ]
              }
            ]
          }
        }
      }
    );
  });

  it('converts destructuring `var` to `const`', () => {
    check(`
      var { a, b } = obj;
    `, `
      const { a, b } = obj;
    `,
      {
        metadata: {
          'declarations.block-scope': {
            declarations: [
              {
                type: Syntax.VariableDeclaration,
                kind: 'var',
                declarations: [
                  {
                    type: Syntax.VariableDeclarator,
                    id: {
                      type: Syntax.ObjectPattern,
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
                        },
                        {
                          type: Syntax.Property,
                          kind: 'init',
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
                    init: { type: Syntax.Identifier, name: 'obj' }
                  }
                ]
              }
            ]
          }
        }
      }
    );
  });

  it('warns about `var` when references precede the declaration', () => {
    check(`
      a;
      var a = 1;
    `, `
      a;
      var a = 1;
    `,
      {
        metadata: {
          'declarations.block-scope': {
            declarations: []
          }
        },
        warnings: [
          {
            type: 'unsupported-declaration',
            message: `'var' declaration cannot be converted to block scope`,
            node: {
              type: Syntax.VariableDeclaration,
              kind: 'var',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: { type: Syntax.Identifier, name: 'a' },
                  init: { type: Syntax.Literal, value: 1, raw: '1' }
                }
              ]
            }
          }
        ]
      }
    );
  });

  it('leaves duplicate `var`s alone', () => {
    check(`
      var a = 1;
      var a = 2;
    `, `
      var a = 1;
      var a = 2;
    `,
      {
        metadata: {
          'declarations.block-scope': {
            declarations: []
          }
        },
        warnings: [
          {
            type: 'unsupported-declaration',
            message: `'var' declaration cannot be converted to block scope`,
            node: {
              type: 'VariableDeclaration',
              kind: 'var',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: { type: Syntax.Identifier, name: 'a' },
                  init: { type: Syntax.Literal, value: 1, raw: '1' }
                }
              ]
            }
          },
          {
            type: 'unsupported-declaration',
            message: `'var' declaration cannot be converted to block scope`,
            node: {
              type: 'VariableDeclaration',
              kind: 'var',
              declarations: [
                {
                  type: Syntax.VariableDeclarator,
                  id: { type: Syntax.Identifier, name: 'a' },
                  init: { type: Syntax.Literal, value: 2, raw: '2' }
                }
              ]
            }
          }
        ]
      }
    );
  });
});
