import type MagicString from 'magic-string';

// FIXME: This is only capable of unindenting one level.
export default function unindent(magicString: MagicString) {
  let { original } = magicString;
  let indentString = magicString.getIndentString();

  let atStartOfLine = true;
  for (let i = 0; i < original.length; i++) {
    if (original[i] === '\n' || original[i] === '\r') {
      atStartOfLine = true;
    } else if (atStartOfLine) {
      atStartOfLine = false;
      if (original.slice(i, i + indentString.length) === indentString) {
        magicString.remove(i, i + indentString.length);
      }
    }
  }
}
