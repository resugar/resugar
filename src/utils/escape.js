import MagicString from 'magic-string';

export default function escape(char: string, start: number, end: number, charAt: (index: number) => string, insert: (index: number, string: string) => void) {
  for (let i = start; i < end; i++) {
    if (charAt(i) === char) {
      // If this character is preceded by an odd number of backslashes, then it
      // is already escaped, so we shouldn't add another backslash.
      let numPrecedingBackslashes = 0;
      while (i - numPrecedingBackslashes - 1 >= start &&
          charAt(i - numPrecedingBackslashes - 1) === '\\') {
        numPrecedingBackslashes++;
      }
      if (numPrecedingBackslashes % 2 == 0) {
        insert(i, '\\');
      }
    }
  }
}

export function escapeString(char: string, string: string, start: number=0, end: number=string.length, magicString: MagicString=new MagicString(string)): string {
  escape(
    char, start, end,
    index => string[index],
    (index, string) => magicString.appendRight(index, string)
  );
  return magicString.toString();
}
