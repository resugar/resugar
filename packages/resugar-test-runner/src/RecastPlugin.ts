import * as Babel from '@babel/core';
import { File } from '@babel/types';
import recast from 'recast';

export function parse(
  code: string,
  options: Babel.ParserOptions,
  parse: (code: string, options: Babel.ParserOptions) => File
): File {
  return recast.parse(code, {
    parser: {
      parse(code: string) {
        return parse(code, { ...options, tokens: true });
      }
    }
  });
}

export function generate(ast: File): { code: string; map?: object } {
  return recast.print(ast);
}

export default function(): Babel.PluginObj {
  return {
    parserOverride: parse,
    generatorOverride: generate
  } as any;
}
