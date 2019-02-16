import babel from 'rollup-plugin-babel';

let pkg = require('./package.json');

export default {
  input: 'src/esnext.js',
  plugins: [
    babel()
  ],
  output: [
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
