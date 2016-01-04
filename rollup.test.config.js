import babel from 'rollup-plugin-babel';
import npm from 'rollup-plugin-npm';

export default {
  entry: 'test/test.js',
  plugins: [babel()],
  format: 'cjs',
  dest: 'build/test-bundle.js'
};
