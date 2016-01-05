import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/esnext.js',
  plugins: [
    babel({
      babelrc: false,
      presets: ['es2015-rollup'],
      plugins: ['syntax-flow', 'transform-flow-strip-types']
    })
  ]
};
