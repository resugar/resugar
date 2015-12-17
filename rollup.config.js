import babel from 'rollup-plugin-babel';
import npm from 'rollup-plugin-npm';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';

function jsnextPlugin(packages) {
  return {
    resolveId(importee, importer) {
      if (packages.indexOf(importee) >= 0) {
        return npmInstance.resolveId(`${importee}-jsnext`, importer);
      }
    }
  };
}

const npmInstance = npm({ jsnext: true });

export default {
  entry: 'src/esnext.js',
  plugins: [
    jsnextPlugin(['assert']),
    json(),
    babel(),
    commonjs({
      include: 'node_modules/**',
      exclude: 'node_modules/*-jsnext/**'
    }),
    npmInstance
  ]
};
