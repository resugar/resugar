import MagicString from 'magic-string';
import type { Scope } from 'escope';
import { analyze } from 'escope';
import { parse } from 'espree';

type Warning = {
  node: Object,
  type: string,
  message: string
};

export type RenderedModule = {
  code: string,
  map: Object,
  warnings: Array<Warning>,
  metadata: Object
};

type Token = {
  type: string,
  value: string,
  range: Array<number>,
  loc: Loc
};

type Loc = {
  line: number,
  column: number
};

type Range = {
  start: number,
  end: number
};

const PARSE_OPTIONS = {
  loc: true,
  range: true,
  sourceType: 'module',
  tokens: true
};

export default class Module {
  constructor(id: ?string, source: string, ecmaFeatures: ?Object) {
    this.id = id;
    this.metadata = ({}: Object);
    this.source = source;
    this.ast = parse(source, Object.assign({}, PARSE_OPTIONS, { ecmaFeatures }));
    this.tokens = this.ast.tokens;
    delete this.ast.tokens;
    this.scopeManager = analyze(this.ast, { ecmaVersion: 6, sourceType: 'module' });
    this.magicString = new MagicString(source, {
      filename: id
    });

    /**
     * @private
     */
    this.warnings = ([]: Array<Warning>);
  }

  warn(node: Object, type: string, message: string) {
    this.warnings.push({ node, type, message });
  }

  tokensForNode(node: Object): Array<Token> {
    return this.tokensInRange(...node.range);
  }

  tokensBetweenNodes(left: Object, right: Object): Array<Token> {
    return this.tokensInRange(left.range[1], right.range[0]);
  }

  tokensInRange(start: number, end: number): Array<Token> {
    const tokenRange = this._tokenIndexRangeForSourceRange(start, end);

    if (!tokenRange) {
      return [];
    }

    return this.tokens.slice(tokenRange.start, tokenRange.end);
  }

  tokenRangeForNode(node: Object): ?Range {
    return this._tokenIndexRangeForSourceRange(node.range[0], node.range[1]);
  }

  _tokenIndexRangeForSourceRange(start: number, end: number): ?Range {
    let location = null;
    let length = 0;
    const tokens = this.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const { range } = tokens[i];
      if (range[1] > end) {
        break;
      } else if (range[0] >= start) {
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
      map: this.magicString.generateMap(),
      ast: this.ast,
      warnings: this.warnings.slice(),
      metadata: this.metadata
    };
  }

  get moduleScope(): Scope {
    for (let i = 0; i < this.scopeManager.scopes.length; i++) {
      if (this.scopeManager.scopes[i].type === 'module') {
        return this.scopeManager.scopes[i];
      }
    }
    return this.scopeManager.globalScope;
  }

  sourceOf(node): string {
    return this.source.slice(...node.range);
  }
}
