/* eslint-disable no-use-before-define */

export type Token = SemanticToken | CommentToken;

export interface Location {
  line: number;
  column: number;
}

export interface SemanticToken {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  loc: {
    start: Location;
    end: Location;
  };
}

export interface TokenType {
  label: string;
}

export interface CommentToken {
  type: 'CommentLine' | 'CommentBlock';
  value: string;
  start: number;
  end: number;
  loc: {
    start: Location;
    end: Location;
  };
}

export interface IndexedToken {
  index: number;
  token: Token;
}
