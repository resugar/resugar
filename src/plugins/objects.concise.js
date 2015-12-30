import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import type Module from '../module';

const { Syntax, VisitorOption  } = estraverse;

export const name = 'objects.concise';
export const description = 'Use concise object property method syntax.';

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

    if (node.method) {
      return false;
    }

    if (node.value.type !== Syntax.FunctionExpression || node.value.id) {
      return false;
    }

    const keyEnd = node.key.range[1];
    const functionEnd = this.endIndexOf('function', keyEnd);

    if (node.computed) {
      this.remove(this.endIndexOf(']', keyEnd), functionEnd);
    } else {
      this.remove(keyEnd, functionEnd);
    }

    this.metadata.properties.push(clone(node));
    node.method = true;

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
