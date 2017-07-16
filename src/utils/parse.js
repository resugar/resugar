import { parse, tokTypes } from 'babylon';

export let BABEL_PARSE_OPTIONS = {
  sourceType: 'module',
  strictMode: true,
  allowImportExportEverywhere: false, // consistent with espree
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: [
    'flow',
    'jsx',
    'asyncFunctions',
    'asyncGenerators',
    'classConstructorCall',
    'classProperties',
    'decorators',
    'doExpressions',
    'exponentiationOperator',
    'exportExtensions',
    'functionBind',
    'functionSent',
    'objectRestSpread',
    'trailingFunctionCommas',
    'optionalChaining',
  ],
  tokens: true,
};

Object.defineProperty(tokTypes.backQuote, 'updateContext', {
  value: tokTypes.backQuote.updateContext,
  configurable: false
});

export default function(source: string) {
  return parse(source, BABEL_PARSE_OPTIONS);
}
