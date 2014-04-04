# esnext

Use tomorrow's JavaScript syntax today.

**NOTE:** This project is early alpha. Use it in production at your own risk.
For a more robust project with similar goals, see [Google's Traceur][traceur].

## Install

```
$ npm install [--save-dev] esnext
```

## Goals

* Allow using future JavaScript syntax today.
* Require as little runtime code as possible.
* Generate human-readable code.
* TODO: Integrate with build tools such as [broccoli][broccoli].

## Non-Goals

* Provide polyfills for future JavaScript APIs.
* Line-by-line equivalence from source to compiled.

## Features

### Available

* classes (via [es6-class][es6-class])
* generators (via [regenerator][regenerator])
* arrow functions (via [es6-arrow-function][es6-arrow-function])

### TODO

* modules (integration with [es6-module-transpiler][es6-module-transpiler] required)
* spread arguments
* rest parameters
* block scoping (`let`)
* destructuring

Any omissions here are not intentional and we'd love to integrate support for
more future JavaScript syntax. See the Contributing section below. Keep in mind
that, as of right now, this project is intended to support new JavaScript
*syntax* only. Any new APIs should be handled using polyfills. This may change
in the future.

## Usage

```js
var compile = require('esnext').compile;
var result = compile(es6Source);
fs.writeFileSync('result.js', result.code, 'utf8');
fs.writeFileSync('result.js.map', JSON.stringify(result.map), 'utf8');
```

## Contributing

[![Build Status](https://travis-ci.org/square/esnext.png?branch=master)](https://travis-ci.org/square/esnext)

### Setup

First, install the development dependencies:

```
$ npm install
```

Then, try running the tests:

```
$ npm test
```

### Pull Requests

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

Any contributors to the master esnext repository must sign the [Individual
Contributor License Agreement (CLA)][cla].  It's a short form that covers our
bases and makes sure you're eligible to contribute.

[cla]: https://spreadsheets.google.com/spreadsheet/viewform?formkey=dDViT2xzUHAwRkI3X3k5Z0lQM091OGc6MQ&ndplr=1

When you have a change you'd like to see in the master repository, [send a pull
request](https://github.com/square/esnext/pulls). Before we merge your
request, we'll make sure you're in the list of people who have signed a CLA.

## Acknowledgements

Huge thanks to [Ben Newman][benjamn] for [recast][recast] and
[regenerator][regenerator]. Thanks also to [Thomas Boyt][thomasboyt] for his
work on the [es6-module-transpiler][es6-module-transpiler],
[es6-class][es6-class], [es6-arrow-function][es6-arrow-function], and others.

[benjamn]: https://github.com/benjamn
[broccoli]: https://github.com/joliss/broccoli
[es6-arrow-function]: https://github.com/square/es6-arrow-function
[es6-class]: https://github.com/square/es6-class
[es6-module-transpiler]: https://github.com/square/es6-module-transpiler
[recast]: https://github.com/benjamn/recast
[regenerator]: http://facebook.github.io/regenerator/
[thomasboyt]: http://www.thomasboyt.com/
[traceur]: https://github.com/google/traceur-compiler
