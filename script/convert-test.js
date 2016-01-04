#!/usr/bin/env node

'use strict';

const readFileSync = require('fs').readFileSync;
const writeFileSync = require('fs').writeFileSync;
const mkdirSync = require('fs').mkdirSync;
const basename = require('path').basename;
const join = require('path').join;
const runInNewContext = require('vm').runInNewContext;
const Syntax = require('estraverse').Syntax;
const stripIndent = require('strip-indent');

const path = process.argv[2];
const name = basename(path, '.js').replace('_test', '').replace(/_/g, '.');
const root = join('test/form', name);

function mkdir(path) {
  try { mkdirSync(path); }
  catch (err) {}
}

function write(path, content) {
  writeFileSync(path, content, { encoding: 'utf8' });
}

function writeJSON(path, content) {
  write(path, JSON.stringify(content, null, 2));
}

let currentTestName;

function checkExample(path) {
  writeJSON(join('test/form', path, 'config.json'), { description: currentTestName });
}

function check(input, output, options) {
  const testRoot = join(root, currentTestName.replace(/\W/g, '-').replace(/--/g, '-')).replace(/-$/g, '');
  mkdir(testRoot);
  write(join(testRoot, 'main.js'), stripIndent(input).trim() + '\n');
  writeJSON(join(testRoot, 'config.json'), { description: currentTestName });

  const expectedRoot = join(testRoot, 'expected');
  mkdir(expectedRoot);
  write(join(expectedRoot, 'main.js'), stripIndent(output).trim() + '\n');

  if (options && options.ast) {
    writeJSON(join(expectedRoot, 'ast.json'), options.ast);
  }

  if (options && options.metadata) {
    writeJSON(join(expectedRoot, 'metadata.json'), options.metadata);
  }

  if (options && options.warnings) {
    writeJSON(join(expectedRoot, 'warnings.json'), options.warnings);
  }
}

function it(name, block) {
  currentTestName = name;
  block();
}

function describe(name, block) {
  block();
}

mkdir(root);
const js = readFileSync(path, { encoding: 'utf8' }).replace(/^import .*?;/mg, '');

runInNewContext(js, {
  describe: describe,
  it: it,
  check: check,
  checkExample: checkExample,
  Syntax: Syntax
});
