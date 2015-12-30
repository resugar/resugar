import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import type Module from '../module';

const { Syntax, VisitorOption  } = estraverse;

export const name = 'objects.shorthand';
export const description = 'Use shorthand notation for object properties.';

type Metadata = {
  properties: Array<Object>
};

class Context extends BaseContext {
  constructor(module: Module) {
    super(name, module);
    module.metadata[name] = ({ properties: [] }: Metadata);
  }

  collapsePropertyToConcise(node: Object): boolean {
    if (node.type !== Syntax.Property) {
      return false;
    }

    if (node.computed || node.shorthand) {
      return false;
    }

    if (node.key.type !== Syntax.Identifier || node.value.type !== Syntax.Identifier) {
      return false;
    }

    if (node.key.name !== node.value.name) {
      return false;
    }

    this.remove(node.key.range[1], node.value.range[1]);
    this.metadata.properties.push(clone(node));
    node.shorthand = true;

    return true;
  }
}

export function begin(module: Module): Context {
  return new Context(module);
}

export function enter(node: Object, parent: Object, module: Module, context: Context): ?VisitorOption {
  context.collapsePropertyToConcise(node);
  return null;
}
