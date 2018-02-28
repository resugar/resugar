import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import { readFileSync } from 'fs';

let pkg = require('./package.json');

export default {
  input: 'src/esnext.js',
  plugins: [
    babel(babelrc())
  ],
  targets: [
    {
      format: 'umd',
      name: 'esnext',
      file: pkg['main']
    },
    {
      format: 'es',
      file: pkg['jsnext:main']
    }
  ]
};
