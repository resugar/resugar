import MagicString from 'magic-string';

export default function escape(char: string, start: number, end: number, charAt: (index: number) => string, insert: (index: number, string: string) => void) {
  for (let i = start; i < end; i++) {
    if (charAt(i) === char) {
      insert(i, '\\');
    }
  }
}

export function escapeString(char: string, string: string, start: number=0, end: number=string.length, magicString: MagicString=new MagicString(string)): string {
  escape(
    char, start, end,
    index => string[index],
    (index, string) => magicString.insert(index, string)
  );
  return magicString.toString();
}
