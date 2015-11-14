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

  remove(start: number, end: number) {
    this.module.magicString.remove(start, end);
  }

  overwrite(start: number, end: number, content: string) {
    this.module.magicString.overwrite(start, end, content);
  }

  insert(index: number, content: string) {
    return this.module.magicString.insert(index, content);
  }
}
