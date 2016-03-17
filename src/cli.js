/* eslint-disable no-console */

import { basename, dirname, join } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import mkdirp from 'mkdirp';
import { convert } from './esnext';
import allPlugins from './plugins/index';

class OptionError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
  }
}

class DelayedWritableFileStream {
  constructor(path: string, options: Object) {
    this.path = path;
    this.options = options;
  }

  write(chunk) {
    return this.stream.write(chunk);
  }

  end() {
    return this.stream.end();
  }

  get stream() {
    if (!this._stream) {
      mkdirp.sync(dirname(this.path));
      this._stream = createWriteStream(this.path, this.options);
    }
    return this._stream;
  }
}

export default function run(args: Array<string>) {
  const options = parseArguments(args);

  if (options.error) {
    process.stderr.write(`${options.error}\n`);
    help(process.stderr);
    process.exit(1);
  } else if (options.help) {
    help(process.stdout);
  } else {
    const input = options.input ?
      createReadStream(options.input, { encoding: 'utf8' }) :
      process.stdin;
    const output = options.output ?
      new DelayedWritableFileStream(options.output, { encoding: 'utf8' }) :
      process.stdout;

    const plugins = allPlugins
      .filter(plugin => {
        if (options.blacklist) {
          return options.blacklist[plugin.name] !== true;
        } else if (options.whitelist) {
          return options.whitelist[plugin.name] === true;
        } else {
          return true;
        }
      });

    readStream(input)
      .then(source => convert(source, { plugins, validate: options.validate, parse: options.parse }))
      .then(result => {
        printWarnings(input.path || '[stdin]', result.warnings);
        output.write(result.code);
      })
      .catch(error => {
        console.error(error.stack);
        process.exit(1);
      });
  }

}

type Warning = { type: string, message: string, node: Object };

function printWarnings(path: string, warnings: Array<Warning>) {
  for (const warning of warnings) {
    printWarning(path, warning);
  }
}

function printWarning(path: string, warning: Warning) {
  const loc = warning.node.loc;
  process.stderr.write(
    `WARNING: ${path}:${loc.start.line}:${loc.start.column + 1}  ${warning.type}  ${warning.message}\n`
  );
}

function readStream(stream) {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => data += chunk);
    stream.on('error', reject);
    stream.on('end', () => resolve(data));
  });
}

type CLIOptions = {
  input: string,
  output: string,
  blacklist: Array<string>,
  whitelist: Array<string>,
  validate: boolean,
  parse: ?((source: string) => Object),
};

function parseArguments(args: Array<string>): CLIOptions | { help: boolean } {
  let blacklist = null;
  let whitelist = null;
  let input;
  let output;
  let validate;
  let inline = false;
  let parse;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-i':
      case '--input':
        if (input) {
          return { error: `Encountered duplicate input option: ${args[i + 1]}` };
        }
        input = parsePath(args[++i]);
        break;

      case '-o':
      case '--output':
        if (output) {
          return { error: `Encountered duplicate output option: ${args[i + 1]}` };
        }
        output = parsePath(args[++i]);
        break;

      case '-h':
      case '--help':
        return { help: true };

      case '-w':
      case '--whitelist':
        if (blacklist) {
          return { error: `Encountered whitelist after blacklist: ${args[i + 1]}` };
        }
        if (!whitelist) {
          whitelist = blank();
        }
        parseList(args[++i]).forEach(name => whitelist[name] = true);
        break;

      case '-b':
      case '--blacklist':
        if (whitelist) {
          return { error: `Encountered blacklist after whitelist: ${args[i + 1]}` };
        }
        if (!blacklist) {
          blacklist = blank();
        }
        parseList(args[++i]).forEach(name => blacklist[name] = true);
        break;

      case '-I':
      case '--inline':
        inline = true;
        break;

      case '--parser':
        parse = loadCustomParser(args[++i]);
        break;

      case '--validate':
      case '--no-validate':
        validate = args[i] === '--validate';
        break;

      default:
        if (args[i][0] === '-') {
          return { error: `Unknown option: ${args[i]}` };
        }
        if (input) {
          return { error: `Duplicate input option: ${args[i]}` };
        }
        input = args[i];
        break;
    }
  }

  if (inline) {
    if (!input) {
      return { error: `Asked to replace input inline but no input was given` };
    } else if (output) {
      return { error: `Asked to replace input inline but output is already set: ${output}` };
    }
    output = input;
  }

  return { input, output, blacklist, whitelist, validate, parse };
}

function parseList(arg: string): Array<string> {
  if (arg === '') {
    return [];
  } else if (!arg || arg[0] === '-') {
    throw new OptionError(`Expected a list but got: ${arg}`);
  }
  return arg.split(',').filter(item => item);
}

function parsePath(arg: string): string {
  if (!arg || arg[0] === '-') {
    throw new OptionError(`Expected a path but got: ${arg}`);
  }
  return arg;
}

function loadCustomParser(module: string): (source: string) => Object {
  let required;
  let isRelative = (
    module.slice(0, './'.length) === './' ||
    module.slice(0, '../'.length) === '../'
  );
  if (isRelative) {
    required = require(join(process.cwd(), module));
  } else {
    required = require(module);
  }
  if (typeof required.parse === 'function') {
    return required.parse;
  } else if (typeof required === 'function') {
    return required
  } else if (typeof required.default === 'function') {
    return required.default;
  } else {
    throw new OptionError(`Unable to load custom parser from ${module}.`);
  }
}

function help(out: (data: string) => void) {
  const $0 = basename(process.argv[1]);
  out.write(`${$0} -o output.js input.js   # read and write files directly\n`);
  out.write(`${$0} input.js > output.js    # read file and write stdout\n`);
  out.write(`${$0} < input.js > output.js  # read stdin and write stdout\n`);
  out.write(`${$0} -I file.js              # rewrite a file inline\n`);
  out.write(`${$0} -b modules.commonjs     # blacklist plugins\n`);
  out.write(`${$0} -w modules.commonjs     # whitelist plugins\n`);
  out.write(`${$0} --parser babel-eslint   # use a custom parser\n`);
  out.write('\n');
  writeSectionHeader(out, 'Built-in Plugins');
  out.write('\n');
  table(
    { out, padding: 2, indent: 2 },
    allPlugins
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ name, description }) => [ name, description ])
  );
  out.write('\n');
  writeSectionHeader(out, 'Additional Options');
  out.write('\n');
  table(
    { out, padding: 4, indent: 2 },
    [
      ['--[no-]validate', 'Turn validation on or off (default: on).']
    ]
  );
}

function writeSectionHeader(out, title) {
  if (out.isTTY) {
    out.write('\x1b[1m');
  }
  out.write(`${title}\n`);
  if (out.isTTY) {
    out.write('\x1b[0m');
  }
}

type TableOptions = {
  out: { write: (data: string) => void },
  indent: number,
  padding: number
};

function table(options: TableOptions, data: Array<Array<string>>) {
  const padding = options.padding || 0;
  const indent = options.indent || 0;
  const out = options.out;
  const longest = [];

  data.forEach(row => {
    row.forEach((value, i) => {
      if (!(i in longest) || value.length > longest[i]) {
        longest[i] = value.length;
      }
    });
  });

  data.forEach(row => {
    for (let j = indent; j--; ) {
      out.write(' ');
    }
    row.forEach((value, i) => {
      out.write(value);
      for (let j = longest[i] + padding - value.length; j--; ) {
        out.write(' ');
      }
    });
    out.write('\n');
  });
}

function blank() {
  return Object.create(null);
}
