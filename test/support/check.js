import stripIndent from 'strip-indent';
import { convert } from '../../src/esnext';
import { deepEqual, strictEqual } from 'assert';

export default function check(input, output, options={}) {
  const result = convert(stripIndent(input));
  strictEqual(result.source, stripIndent(output));

  deepEqual(result.warnings, options.warnings || []);
  deepEqual(result.metadata, options.metadata || {});
}
