/**
 * Change the escape characters to convert the given string contents from one
 * quote style to another.
 */
export default function convertStringEscaping(fromQuote: string, toQuote: string, string: string): string {
  if (fromQuote === toQuote) {
    return string;
  }
  let result = '';
  for (let i = 0; i < string.length; i++) {
    // We always start in an unescaped position, and advance forward if we see
    // an escape.
    if (string[i] === '\\') {
      if (string[i + 1] === fromQuote) {
        // No need to escape anymore.
        result += string[i + 1];
        i++;
      } else {
        // Copy both characters (or just one if we're at the end).
        result += string.slice(i, i + 2);
        i++;
      }
    } else if (string[i] === toQuote) {
      result += `\\${string[i]}`;
    } else if (string.slice(i, i + 2) === '${' && toQuote === '`') {
      result += `\\${string[i]}`;
    } else {
      result += string[i];
    }
  }
  return result;
}
