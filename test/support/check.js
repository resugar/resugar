import stripIndent from 'strip-indent';
import { convert } from '../../src/esnext';
import { deepEqual, strictEqual } from 'assert';
import { join } from 'path';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';

export function checkExamples(name: string) {
  const directory = join('test/form', name);
  describe(name, () => {
    readdirSync(directory).forEach(example => {
      const config = readOptionalJSON(join(directory, example, 'config.json')) || {};
      const description = config.description || example;
      const testFn = config.skip ? it.skip : config.only ? it.only : it;
      testFn(description, () => checkExample(join(name, example)));
    });
  });
}

export function checkExample(name: string) {
  const directory = join('test/form', name);
  const expectedDir = join(directory, '_expected');
  const actualDir = join(directory, '_actual');
  const input = read(join(directory, 'main.js'));
  const actual = stripLocationInformation(convert(stripIndent(input).trim()));

  mkdir(actualDir);
  write(join(actualDir, 'main.js'), actual.code);
  writeJSON(join(actualDir, 'metadata.json'), actual.metadata);
  writeJSON(join(actualDir, 'ast.json'), actual.ast);
  if (actual.warnings.length > 0) {
    writeJSON(join(actualDir, 'warnings.json'), actual.warnings);
  }

  const expectedCode = read(join(expectedDir, 'main.js'));
  const expectedMetadata = readOptionalJSON(join(expectedDir, 'metadata.json'));
  const expectedAst = readOptionalJSON(join(expectedDir, 'ast.json'));
  const expectedWarnings = readOptionalJSON(join(expectedDir, 'warnings.json'));

  strictEqual(actual.code, stripIndent(expectedCode).trim());

  deepEqual(actual.warnings, expectedWarnings || []);

  if (expectedMetadata) {
    for (const key in expectedMetadata) {
      deepEqual(actual.metadata[key], expectedMetadata[key]);
    }
  }

  if (expectedAst) {
    deepEqual(actual.ast, expectedAst);
  }
}

function stripLocationInformation(node: Object, seen: Array<Object>=[]): Object {
  if (seen.indexOf(node) >= 0) {
    return;
  }
  seen.push(node);

  if (Array.isArray(node)) {
    node.forEach(child => stripLocationInformation(child, seen));
  } else if (node && typeof node === 'object') {
    delete node.loc;
    delete node.range;

    Object.getOwnPropertyNames(node)
      .forEach(name => stripLocationInformation(node[name], seen));
  }

  return node;
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
  catch (err) { return; }
}

function write(path: string, content: string) {
  writeFileSync(path, content, { encoding: 'utf8' });
}

function writeJSON(path: string, value: any) {
  write(path, JSON.stringify(value, null, 2));
}
