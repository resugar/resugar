import babel from 'rollup-plugin-babel';

function jsnextPlugin(packages) {
  const npmInstance = npm({ jsnext: true });

  return {
    resolveId(importee, importer) {
      if (packages.indexOf(importee) >= 0) {
        return npmInstance.resolveId(`${importee}-jsnext`, importer);
      }
    }
  };
}

export default {
  entry: 'src/esnext.js',
  plugins: [
    jsnextPlugin(['assert']),
    babel({
      babelrc: false,
      presets: ['es2015-rollup'],
      plugins: ['syntax-flow', 'transform-flow-strip-types']
    })
  ]
};
