import stripIndent from 'strip-indent';
import { convert } from '../../src/esnext';
import { deepEqual, strictEqual } from 'assert';
import { join } from 'path';
import { readFileSync, readdirSync } from 'fs';

type CheckOptions = {
  metadata: ?Object,
  ast: ?Object,
  warnings: ?Array<Warning>
};

type Warning = {
  type: string,
  message: string,
  node: ?Object
};

export default function check(input: string, output: string, options: CheckOptions={}) {
  const result = convert(stripIndent(input).trim());
  strictEqual(result.code, stripIndent(output).trim());

  stripLocationInformation(result);

  deepEqual(result.warnings, options.warnings || []);

  if (options.metadata) {
    for (const key in options.metadata) {
      deepEqual(result.metadata[key], options.metadata[key]);
    }
  }

  if (options.ast) {
    deepEqual(result.ast, options.ast);
  }
}

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
  check(
    read(join(directory, 'main.js')),
    read(join(directory, 'expected/main.js')),
    {
      metadata: readOptionalJSON(join(directory, 'expected/metadata.json')),
      ast: readOptionalJSON(join(directory, 'expected/ast.json')),
      warnings: readOptionalJSON(join(directory, 'expected/warnings.json'))
    }
  );
}

function stripLocationInformation(node: Object, seen: Array<Object>=[]) {
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
