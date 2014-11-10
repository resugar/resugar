# esnext

Use tomorrow's JavaScript syntax today. [Try it now in your browser](https://esnext.github.io/esnext/).

## Install

```
$ npm install [--save-dev] esnext
```

## Goals

* Allow using future JavaScript syntax today.
* Require as little runtime code as possible.
* Generate human-readable code.

## Non-Goals

* Provide polyfills for future JavaScript APIs.
* Line-by-line equivalence from source to compiled.

## Features

### Available

* [arrow functions][features-arrows] (via [es6-arrow-function][es6-arrow-function])
* [classes][features-classes] (via [es6-class][es6-class])
* [computed property keys][features-enhanced-object-literals] (via [es6-computed-property-keys][es6-computed-property-keys])
* [computed property keys][features-enhanced-object-literals] (via [es6-computed-properties][es6-computed-properties])
* [default params][features-default-rest-spread] (via [es6-default-params][es6-default-params])
* [destructuring][features-destructuring] (via [es6-destructuring][es6-destructuring])
* [generators][features-generators] (via [regenerator][regenerator])
* [async-await](https://github.com/lukehoban/ecmascript-asyncawait) (via [regenerator][regenerator])
* [iterators + for-of][features-iterators-for-of] (via [regenerator][regenerator])
* [object literal concise definitions][features-enhanced-object-literals] (via [es6-object-concise][es6-object-concise])
* [object literal shorthand][features-enhanced-object-literals] (via [es6-object-short][es6-object-short])
* [rest params][features-default-rest-spread] (via [es6-rest-params][es6-rest-params])
* [spread][features-default-rest-spread] (via [es6-spread][es6-spread])
* [template strings][features-template-strings] (via [es6-templates][es6-templates])
* [unicode regexes][features-unicode] (via [regexpu][regexpu])

### TODO

* [block scoping (`let`)][features-let-const]
* [modules][features-modules] (i.e. integration with [es6-module-transpiler][es6-module-transpiler])

Any omissions here are not intentional and we'd love to integrate support for
more future JavaScript syntax (see [es6features][es6features] for a more
complete list). See the Contributing section below. Keep in mind that, as of
right now, this project is intended to support new JavaScript *syntax* only.
Any new APIs should be handled using polyfills. This may change in the future.

## Usage

### As a CLI

esnext ships with a command-line interface that can be used when installed
globally (or from within your project at `node_modules/.bin/esnext` when
installed locally). Here's how to compile a single file an print it to stdout:

```
$ esnext myfile.js
```

If you don't care about a certain feature, such as arrow functions, you can
omit support for them like so:

```
$ esnext --no-arrow-function myfile.js
```

To compile many files at once, specify an output directory:

```
$ esnext -o build lib/**/*.js
```

To enable source maps for these files, add the `--source-maps` flag.

### As a Library

```js
var compile = require('esnext').compile;
var result = compile(es6Source);
fs.writeFileSync('result.js', result.code, 'utf8');
fs.writeFileSync('result.js.map', JSON.stringify(result.map), 'utf8');
```

### With other tools

esnext can be used out of the box as a [Browserify](http://browserify.org)
transform (and can be used with [watchify](https://github.com/substack/watchify)
for better efficiency). For example:

    $ browserify -t esnext main.js

Or, use one of these libraries that integrate esnext with other tools:

* [broccoli-esnext][broccoli-esnext]
* [grunt-esnext][grunt-esnext]
* [gulp-esnext][gulp-esnext]
* [esnext-loader][esnext-loader]

## Contributing

[![Build Status](https://travis-ci.org/esnext/esnext.png?branch=master)](https://travis-ci.org/esnext/esnext)

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
request](https://github.com/esnext/esnext/pulls). Before we merge your
request, we'll make sure you're in the list of people who have signed a CLA.

## Acknowledgements

Huge thanks to [Ben Newman][benjamn] for [recast][recast] and
[regenerator][regenerator]. Thanks to [Ariya Hidayat][ariya] for
[esprima][esprima]. Thanks also to [Thomas Boyt][thomasboyt] for his work on
the [es6-module-transpiler][es6-module-transpiler], [es6-class][es6-class],
[es6-arrow-function][es6-arrow-function], and others.

[ariya]: https://github.com/ariya
[benjamn]: https://github.com/benjamn
[broccoli-esnext]: https://github.com/shinnn/broccoli-esnext
[broccoli]: https://github.com/joliss/broccoli
[es6-arrow-function]: https://github.com/esnext/es6-arrow-function
[es6-class]: https://github.com/esnext/es6-class
[es6-default-params]: https://github.com/esnext/es6-default-params
[es6-destructuring]: https://github.com/fdecampredon/es6-destructuring
[es6-computed-properties]: https://github.com/DmitrySoshnikov/es6-computed-properties
[es6-module-transpiler]: https://github.com/esnext/es6-module-transpiler
[es6-object-concise]: https://github.com/vslinko/es6-object-concise
[es6-object-short]: https://github.com/vslinko/es6-object-short
[es6-rest-params]: https://github.com/thomasboyt/es6-rest-params
[es6-spread]: https://github.com/esnext/es6-spread
[es6-templates]: https://github.com/esnext/es6-templates
[es6features]: https://github.com/lukehoban/es6features
[esnext-loader]: https://github.com/conradz/esnext-loader
[esprima]: https://github.com/ariya/esprima
[features-arrows]: https://github.com/lukehoban/es6features#arrows
[features-classes]: https://github.com/lukehoban/es6features#classes
[features-default-rest-spread]: https://github.com/lukehoban/es6features#default--rest--spread
[features-destructuring]: https://github.com/lukehoban/es6features#destructuring
[features-enhanced-object-literals]: https://github.com/lukehoban/es6features#enhanced-object-literals
[features-generators]: https://github.com/lukehoban/es6features#generators
[features-iterators-for-of]: https://github.com/lukehoban/es6features#iterators--forof
[features-let-const]: https://github.com/lukehoban/es6features#let--const
[features-modules]: https://github.com/lukehoban/es6features#modules
[features-template-strings]: https://github.com/lukehoban/es6features#template-strings
[features-unicode]: https://github.com/lukehoban/es6features#unicode
[grunt-esnext]: https://github.com/shinnn/grunt-esnext
[gulp-esnext]: https://github.com/sindresorhus/gulp-esnext
[recast]: https://github.com/benjamn/recast
[regexpu]: https://github.com/mathiasbynens/regexpu
[regenerator]: http://facebook.github.io/regenerator/
[thomasboyt]: http://www.thomasboyt.com/
