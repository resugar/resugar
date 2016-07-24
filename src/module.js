import clone from './utils/clone.js';
import parse from './utils/parse';
import MagicString from 'magic-string';
import type { Node, Token } from './types';

type Warning = {
  node: Node,
  type: string,
  message: string
};

export type RenderedModule = {
  ast: Node,
  code: string,
  metadata: Object,
  warnings: Array<Warning>,
};

type Range = {
  start: number,
  end: number
};

export default class Module {
  id: ?string;
  metadata = {};
  source: string;
  ast: Node;
  tokens: Array<Token>;
  magicString: MagicString;
  warnings: Array<Warning> = [];

  constructor(id: ?string, source: string) {
    this.id = id;
    this.reinit(source);
  }

  /**
   * @private
   */
  reinit(source: string) {
    this.source = source;
    this.ast = parse(source);
    this.tokens = this.ast.tokens;
    this.magicString = new MagicString(source, {
      filename: this.id
    });
  }

  commit() {
    let source = this.magicString.toString();

    if (source !== this.source) {
      this.reinit(source);
    }
  }

  warn(node: Node, type: string, message: string) {
    this.warnings.push({ node: clone(node), type, message });
  }

  tokensForNode(node: Node): Array<Token> {
    return this.tokensInRange(node.start, node.end);
  }

  tokensInRange(start: number, end: number): Array<Token> {
    let tokenRange = this.tokenIndexRangeForSourceRange(start, end);

    if (!tokenRange) {
      return [];
    }

    return this.tokens.slice(tokenRange.start, tokenRange.end);
  }

  tokenIndexRangeForSourceRange(start: number, end: number): ?Range {
    let location = null;
    let length = 0;
    let tokens = this.tokens;

    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      if (token.end > end) {
        break;
      } else if (token.start >= start) {
        if (location === null) { location = i; }
        length++;
      }
    }

    if (location === null) {
      return null;
    }

    return { start: location, end: location + length };
  }

  render(): RenderedModule {
    return {
      code: this.magicString.toString(),
      ast: this.ast,
      warnings: this.warnings.slice(),
      metadata: this.metadata
    };
  }

  sourceOf(node: Node): string {
    return this.source.slice(node.start, node.end);
  }
}
