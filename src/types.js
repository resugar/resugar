/* eslint-disable no-use-before-define */

export type Token = SemanticToken | CommentToken;

type SemanticToken = {
  type: TokenType,
  value: string,
  start: number,
  end: number,
};

type TokenType = {
  label: string,
};

type CommentToken = {
  type: 'CommentLine' | 'CommentBlock';
  value: string,
  start: number,
  end: number,
};

export type IndexedToken = {
  index: number,
  token: Token,
};

export type Node = Object;

export type Scope = {
  traverse: (node: Node, visitor: Visitor) => void,
};

export type Path = {
  node: Node,
  parent: Node,
  parentPath: Path,
  scope: Scope,
  get: (key: string) => ?(Path | Array<Path>),
};

export type Visitor = {
  [key: string]: (path: Path) => void
};

export type Binding = {
  constant: boolean,
  constantViolations: Array<Node>,
  identifier: Node,
  path: Path,
  referencePaths: Array<Path>,
  scope: Scope,
};
