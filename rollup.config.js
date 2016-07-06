import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import { readFileSync } from 'fs';

var pkg = require('./package.json');

export default {
  entry: 'src/esnext.js',
  plugins: [
    babel(babelrc())
  ],
  targets: [
    {
      format: 'umd',
      moduleName: 'esnext',
      dest: pkg['main']
    },
    {
      format: 'es',
      dest: pkg['jsnext:main']
    }
  ]
};
