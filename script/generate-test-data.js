#!/usr/bin/env node

const convert = require('..').convert;
const readFileSync = require('fs').readFileSync;
const writeFileSync = require('fs').writeFileSync;
const statSync = require('fs').statSync;
const readdirSync = require('fs').readdirSync;
const mkdirSync = require('fs').mkdirSync;
const join = require('path').join;
const dirname = require('path').dirname;

function exists(path) {
  try { statSync(path); return true; }
  catch (ex) { return false; }
}

function write(path, content) {
  writeFileSync(path, content, { encoding: 'utf8' });
}

function writeJSON(path, content) {
  write(path, JSON.stringify(content, null, 2));
}

function mkdir(path) {
  try {
    const parent = dirname(path);
    if (parent !== path) {
      mkdir(parent);
    }
    mkdirSync(path);
  }
  catch (ex) {}
}

readdirSync('test/form').forEach(exampleSet => {
  const exampleSetRoot = join('test/form', exampleSet);

  readdirSync(exampleSetRoot).forEach(example => {
    const exampleRoot = join(exampleSetRoot, example);
    const expectedRoot = join(exampleRoot, 'expected');

    if (exists(expectedRoot)) {
      return;
    }

    const mainPath = join(exampleRoot, 'main.js');
    const main = readFileSync(mainPath, {encoding: 'utf8'});
    const result = convert(main);

    mkdir(expectedRoot);

    const codePath = join(exampleRoot, 'expected/main.js');
    if (!exists(codePath)) {
      write(codePath, result.code);
    }

    if (result.metadata) {
      const metadataPath = join(exampleRoot, 'expected/metadata.json');
      if (!exists(metadataPath)) {
        writeJSON(metadataPath, result.metadata);
      }
    }

    if (result.ast) {
      const astPath = join(exampleRoot, 'expected/ast.json');
      if (!exists(astPath)) {
        writeJSON(astPath, result.ast);
      }
    }

    if (result.warnings && result.warnings.length) {
      const warningsPath = join(exampleRoot, 'expected/warnings.json');
      if (!exists(warningsPath)) {
        writeJSON(warningsPath, result.warnings);
      }
    }
  });
});
