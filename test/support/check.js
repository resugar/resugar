import parse, { BABEL_PARSE_OPTIONS } from '../../src/utils/parse';
import stripIndent from 'strip-indent';
import { convert } from '../../src/esnext';
import { join } from 'path';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import cleanNode from '../../src/utils/cleanNode.js';

export function checkExamples(name: string) {
  let directory = join(__dirname, '../form', name);
  describe(name, () => {
    readdirSync(directory).forEach(example => {
      let exampleRoot = join(directory, example);
      if (statSync(exampleRoot).isDirectory()) {
        let configJSONPath = join(exampleRoot, 'config.json');
        let config = readOptionalJSON(configJSONPath) || {};
        let description = config.description || example;
        let testFn = config.skip ? test.skip : config.only ? test.only : test;
        testFn(description, () => checkExample(join(name, example), config.options));
      }
    });
  });
}

export function checkExample(name: string, options: Object={}) {
  let directory = join('test/form', name);
  let actualDir = join(directory, '_actual');
  let input = read(join(directory, 'main.js'));
  let actual = convert(stripIndent(input).trim(), options);

  mkdir(actualDir);
  write(join(actualDir, 'main.js'), actual.code);
  if (actual.warnings.length > 0) {
    writeJSON(join(actualDir, 'warnings.json'), actual.warnings);
  }

  expect(actual.code).toMatchSnapshot('code');
  expect(actual.warnings).toMatchSnapshot('warnings');

  expect(
    cleanNode(actual.ast.program)
  ).toEqual(
    cleanNode(parse(actual.code, BABEL_PARSE_OPTIONS).program)
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
