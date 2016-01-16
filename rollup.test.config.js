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
  intro: 'require("source-map-support").install();',
  format: 'cjs',
  dest: 'build/test-bundle.js',
  sourceMap: true
};
