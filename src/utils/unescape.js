import MagicString from 'magic-string';

export default function unescape(char: string, start: number, end: number, charAt: (index: number) => string, remove: (start: number, end: number) => void) {
  for (let i = start; i < end; i++) {
    if (charAt(i) === '\\' && charAt(i + 1) === char) {
      remove(i, i + 1);
      i++;
    }
  }
}

export function unescapeString(
  char: string,
  string: string,
  start: number=0,
  end: number=string.length,
  magicString: MagicString=new MagicString(string)
): string {
  unescape(
    char, start, end,
    index => string[index],
    (start, end) => magicString.remove(start, end)
  );
  return magicString.toString();
}
