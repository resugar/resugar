import config from './rollup.config';

config.format = 'umd';
config.moduleName = 'esnext';
config.dest = 'dist/esnext.umd.js';

export default config;
