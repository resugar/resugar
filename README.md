# esnext

Bring your JavaScript into the future.

## Installation

```
$ npm install -g esnext
```

## Usage

After installing, run `esnext -h` for comprehensive usage instructions.

## Features

### Modules

Translate CommonJS modules into ES6 modules:

```js
var readFile = require('fs').readFile;
const MagicString = require('magic-string');
let { ok, strictEqual: eq } = require('assert');

exports.doSomething = function() {
  ok(1);
};

// ↑ becomes ↓

import { readFile } from 'fs';
import MagicString from 'magic-string';
import { ok, strictEqual as eq } from 'assert';

export function doSomething() {
  ok(1);
}
```
