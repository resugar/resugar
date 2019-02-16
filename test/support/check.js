import parse, { BABEL_PARSE_OPTIONS } from '../../src/utils/parse';
import stripIndent from 'strip-indent';
import { convert } from '../../src/esnext';
import { deepEqual, strictEqual } from 'assert';
import { join } from 'path';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import cleanNode from '../../src/utils/cleanNode.js';

export function checkExamples(name: string) {
  let directory = join(__dirname, '../form', name);
  let suiteConfigPath = join(directory, '_config.js');
  let suiteConfig = requireOptional(suiteConfigPath) || {};
  let suiteFn = suiteConfig.skip ? describe.skip : suiteConfig.only ? describe.only : describe;
  suiteFn(name, () => {
    readdirSync(directory).forEach(example => {
      let exampleRoot = join(directory, example);
      if (statSync(exampleRoot).isDirectory()) {
        let configJSONPath = join(exampleRoot, 'config.json');
        let configJSPath = join(exampleRoot, '_config.js');
        let config = requireOptional(configJSPath) || readOptionalJSON(configJSONPath) || {};
        let description = config.description || example;
        let testFn = config.skip ? it.skip : config.only ? it.only : it;
        testFn(description, () => checkExample(join(name, example), config.options));
      }
    });
  });
}

export function checkExample(name: string, options: Object={}) {
  let directory = join('test/form', name);
  let expectedDir = join(directory, '_expected');
  let actualDir = join(directory, '_actual');
  let input = read(join(directory, 'main.js'));
  let actual = convert(stripIndent(input).trim(), options);

  mkdir(actualDir);
  write(join(actualDir, 'main.js'), actual.code);
  writeJSON(join(actualDir, 'ast.json'), actual.ast);
  if (actual.warnings.length > 0) {
    writeJSON(join(actualDir, 'warnings.json'), actual.warnings);
  }

  let expectedCode = read(join(expectedDir, 'main.js'));
  let expectedWarnings = readOptionalJSON(join(expectedDir, 'warnings.json'));

  strictEqual(actual.code, stripIndent(expectedCode).trim());

  deepEqual(actual.warnings, expectedWarnings || []);

  deepEqual(
    cleanNode(actual.ast.program),
    cleanNode(parse(actual.code, BABEL_PARSE_OPTIONS).program),
    're-written AST should match re-written code'
  );
}

function read(path: string): string {
  return readFileSync(path, { encoding: 'utf8' });
}

function readJSON(path: string): Object|Array<any> {
  return JSON.parse(read(path));
}

function readOptionalJSON(path: string): ?(Object|Array<any>) {
  try { return readJSON(path); }
  catch (err) { return null; }
}

function requireOptional(path: string): ?any {
  try { return require(path); }
  catch (err) { return null; }
}

function mkdir(path: string) {
  try { mkdirSync(path); }
  catch (err) { /* ignore */ }
}

function write(path: string, content: string) {
  writeFileSync(path, content, { encoding: 'utf8' });
}

function writeJSON(path: string, value: any) {
  write(path, JSON.stringify(value, null, 2));
}
