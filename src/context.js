import type Module from './module';

export default class Context {
  constructor(pluginName: string, module: Module) {
    this.pluginName = pluginName;
    this.module = module;
  }

  get metadata(): Object {
    return this.module.metadata[this.pluginName];
  }

  charAt(index: number): string {
    return this.module.magicString.original[index];
  }

  slice(start: number, end: number): string {
    return this.module.magicString.original.slice(start, end);
  }

  remove(start: number, end: number): Context {
    this.module.magicString.remove(start, end);
    return this;
  }

  overwrite(start: number, end: number, content: string): Context {
    this.module.magicString.overwrite(start, end, content);
    return this;
  }

  insert(index: number, content: string): Context {
    this.module.magicString.insert(index, content);
    return this;
  }

  indexOf(string: string, start: number=0): number {
    return this.module.magicString.original.indexOf(string, start);
  }

  endIndexOf(string: string, start: number=0): number {
    const startIndexOf = this.indexOf(string, start);
    if (startIndexOf < 0) {
      return startIndexOf;
    }
    return startIndexOf + string.length;
  }

  escape(char: string, start: number, end: number): Context {
    for (let i = start; i < end; i++) {
      if (this.charAt(i) === char) {
        this.insert(i, '\\');
      }
    }
    return this;
  }

  unindent(): Context {
    // FIXME: This is only capable of unindenting one level.
    const { original } = this.module.magicString;
    const indentString = this.module.magicString.getIndentString();

    let atStartOfLine = true;
    for (let i = 0; i < original.length; i++) {
      if (atStartOfLine) {
        atStartOfLine = false;
        if (original.slice(i, i + indentString.length) === indentString) {
          this.remove(i, i + indentString.length);
        }
      }
      if (original[i] === '\n') {
        atStartOfLine = true;
      }
    }

    return this;
  }
}
