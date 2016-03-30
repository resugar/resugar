import MagicString from 'magic-string';

export default function unescape(char: string, start: number, end: number, charAt: (index: number) => string, remove: (start: number, end: number) => void) {
  for (let i = start; i < end; i++) {
    if (charAt(i) === '\\' && charAt(i + 1) === char) {
      remove(i, i + 1);
      i++;
    }
  }
}

export function unescapeString(char: string, string: string): string {
  let result = new MagicString(string);
  unescape(
    char, 0, string.length,
    index => string[index],
    (start, end) => result.remove(start, end)
  );
  return result.toString();
}
