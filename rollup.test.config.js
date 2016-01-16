import config from './rollup.config';

config.entry = 'test/test.js';
config.intro = 'require("source-map-support").install();';
config.format = 'cjs';
config.dest = 'build/test-bundle.js';
config.sourceMap = true;

export default config;
