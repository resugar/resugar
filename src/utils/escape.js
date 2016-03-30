import MagicString from 'magic-string';

export default function escape(char: string, start: number, end: number, charAt: (index: number) => string, insert: (index: number, string: string) => void) {
  for (let i = start; i < end; i++) {
    if (charAt(i) === char) {
      insert(i, '\\');
    }
  }
}

export function escapeString(char: string, string: string): string {
  let result = new MagicString(string);
  escape(
    char, 0, string.length,
    index => string[index],
    (index, string) => result.insert(index, string)
  );
  return result.toString();
}
