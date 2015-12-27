import MagicString from 'magic-string';
import type { Scope } from 'escope';
import { analyze } from 'escope';
import { parse } from 'espree';

const PARSE_OPTIONS = {
  loc: true,
  range: true,
  ecmaFeatures: {
    // enable parsing of arrow functions
    arrowFunctions: true,

    // enable parsing of let/const
    blockBindings: true,

    // enable parsing of destructured arrays and objects
    destructuring: true,

    // enable parsing of regular expression y flag
    regexYFlag: true,

    // enable parsing of regular expression u flag
    regexUFlag: true,

    // enable parsing of template strings
    templateStrings: true,

    // enable parsing of binary literals
    binaryLiterals: true,

    // enable parsing of ES6 octal literals
    octalLiterals: true,

    // enable parsing unicode code point escape sequences
    unicodeCodePointEscapes: true,

    // enable parsing of default parameters
    defaultParams: true,

    // enable parsing of rest parameters
    restParams: true,

    // enable parsing of for-of statement
    forOf: true,

    // enable parsing computed object literal properties
    objectLiteralComputedProperties: true,

    // enable parsing of shorthand object literal methods
    objectLiteralShorthandMethods: true,

    // enable parsing of shorthand object literal properties
    objectLiteralShorthandProperties: true,

    // Allow duplicate object literal properties (except '__proto__')
    objectLiteralDuplicateProperties: true,

    // enable parsing of generators/yield
    generators: true,

    // enable parsing spread operator
    spread: true,

    // enable super in functions
    superInFunctions: true,

    // enable parsing classes
    classes: true,

    // enable parsing of new.target
    newTarget: false,

    // enable parsing of modules
    modules: true,

    // enable React JSX parsing
    jsx: true,

    // enable return in global scope
    globalReturn: true,

    // allow experimental object rest/spread
    experimentalObjectRestSpread: true
  }
};

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

export default class Module {
  constructor(id: ?string, source: string) {
    this.id = id;
    this.metadata = ({}: Object);
    this.source = source;
    this.ast = parse(source, PARSE_OPTIONS);
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

  render(): RenderedModule {
    return {
      code: this.magicString.toString(),
      map: this.magicString.generateMap(),
      warnings: this.warnings,
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
