import config from './rollup.config';

config.format = 'es6';
config.dest = 'dist/esnext.ecma.js';

export default config;
