/**
 * Represents a module binding for either an import or export statement.
 */
export class Binding {
  constructor(
    public readonly localName: string,
    public readonly exportName: string
  ) {}

  isAliased(): boolean {
    return this.localName !== this.exportName;
  }

  isDefaultExport(): boolean {
    return this.exportName === 'default';
  }
}

/**
 * Builds an export specifier list string for use in an export statement.
 */
export class ExportSpecifierListStringBuilder {
  constructor(private readonly bindings: Array<Binding>) {}

  static build(bindings: Array<Binding>): string {
    return new ExportSpecifierListStringBuilder(bindings).toString();
  }

  toString(): string {
    return `{ ${this.bindings
      .map((binding: Binding) => {
        if (!binding.isAliased()) {
          return binding.localName;
        } else {
          return `${binding.localName} as ${binding.exportName}`;
        }
      })
      .join(', ')} }`;
  }
}

/**
 * Builds an import specifier list string for use in an import statement.
 */
export class ImportSpecifierListStringBuilder {
  constructor(private readonly bindings: Array<Binding>) {}

  static build(bindings: Array<Binding>): string {
    return new ImportSpecifierListStringBuilder(bindings).toString();
  }

  toString(): string {
    let defaultBinding;
    let namedBindings = [];

    for (let binding of this.bindings) {
      if (binding.isDefaultExport()) {
        defaultBinding = binding;
      } else {
        namedBindings.push(binding);
      }
    }

    let result = '';

    let hasNamedBindings = namedBindings.length > 0;
    if (defaultBinding) {
      result += defaultBinding.localName;
      if (hasNamedBindings) {
        result += ', ';
      }
    }

    if (hasNamedBindings) {
      result += `{ ${namedBindings
        .map((binding: Binding) => {
          if (!binding.isAliased()) {
            return binding.localName;
          } else {
            return `${binding.exportName} as ${binding.localName}`;
          }
        })
        .join(', ')} }`;
    }

    return result;
  }
}
