import babel from 'rollup-plugin-babel';
import { readFileSync } from 'fs';

function babelConfig() {
  var result = JSON.parse(readFileSync('.babelrc', { encoding: 'utf8' }));
  result.babelrc = false;
  result.presets = result.presets.map(function(preset) {
    if (preset === 'es2015') {
      return 'es2015-rollup';
    } else {
      return preset;
    }
  });
  return result;
}

export default {
  entry: 'src/esnext.js',
  plugins: [
    babel(babelConfig())
  ]
};
