import babel from 'rollup-plugin-babel';

export default {
  entry: 'test/test.js',
  plugins: [
    babel({
      babelrc: false,
      presets: ['es2015-rollup'],
      plugins: ['syntax-flow', 'transform-flow-strip-types']
    })
  ],
  format: 'cjs',
  dest: 'build/test-bundle.js'
};
