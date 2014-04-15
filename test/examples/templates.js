function r(strings) {
  assert.equal(strings[0], '\n');
  assert.equal(strings.raw[0], '\\n');
  return strings.raw.join('');
}

assert.equal(r `\n`, '\\n');
