# esnext [![Build Status](https://api.travis-ci.org/esnext/esnext.svg?branch=master)](https://travis-ci.org/esnext/esnext)

Bring your JavaScript into the future.

## Installation

```
$ yarn global add esnext
# or, with `npm`:
$ npm install -g esnext
```

## Usage

After installing, run `esnext -h` for comprehensive usage instructions.

## Features

### Functions

Translate some regular functions to arrow functions:

```js
list.map(function(item) { return item.name; });

// ↑ becomes ↓

list.map(item => item.name);
```

### Declarations

Convert `var` declarations to `let` or `const` as appropriate:

```js
var arr = [];
for (var i = 0; i < 5; i++) {
  arr.push(i);
}

// ↑ becomes ↓

const arr = [];
for (let i = 0; i < 5; i++) {
  arr.push(i);
}
```

### Objects

Use shorthand syntax for various object constructs:

```js
let person = {
  first: first,
  last: last,
  
  fullName: function() {
    return `${first} ${last}`;
  }
};

// ↑ becomes ↓

let person = {
  first,
  last,
  
  fullName() {
    return `${first} ${last}`;
  }
};
```

### Strings

Convert string concatenation to string or template literals:

```js
let name = 'Brian' + ' ' + 'Donovan';
let greeting = 'Hello, ' + name;

// ↑ becomes ↓

let name = 'Brian Donovan';
let greeting = `Hello, ${name}`;
```

### Destructuring

Convert assignments and declarations to use object destructuring syntax:

```js
let a = obj.a, b = obj.b;
a = obj2.a, b = obj2.b;

// ↑ becomes ↓

let { a, b } = obj;
({ a, b } = obj2);
```

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

## Options

```js
{
  'declarations.block-scope': {
    /**
     * Set this to `true` to only turn `var` into `let`, never `const`.
     */
    disableConst: boolean
  }
}
```
