import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import replace from '../utils/replace';
import type Module from '../module';

const { Syntax, VisitorOption } = estraverse;

export const name = 'strings.template';
export const description = 'Transforms manual string concatenation into template strings.';

type Metadata = {
  concatenations: Array<{
    node: Object
  }>
};

class Context extends BaseContext {
  constructor(module: Module) {
    super(name, module);
    module.metadata[name] = ({
      concatenations: []
    }: Metadata);
  }

  flatten(node: Object): ?Array<Object> {
    if (node.type !== Syntax.BinaryExpression || node.operator !== '+') {
      return null;
    }

    const { left, right } = node;

    if (isString(left)) {
      // This is the root.
      return [left, right];
    } else {
      // We need to go deeper.
      const flattenedLeft = this.flatten(left);
      if (!flattenedLeft) {
        return null;
      }
      return [...flattenedLeft, right];
    }
  }

  combine(node: Object, parts: Array<Object>): Object {
    if (parts.every(isString)) {
      return this.combineStrings(parts);
    } else {
      return this.buildTemplateString(node, parts);
    }
  }

  combineStrings(parts: Array<Object>): Object {
    const quote = this.charAt(parts[0].range[0]);
    let { value } = parts[0];
    let raw = parts[0].raw.slice(1, -1);

    for (let i = 0; i < parts.length; i++) {
      const thisPart = parts[i];
      const nextPart = parts[i + 1];
      if (nextPart) {
        // Remove the space between the strings.
        this.remove(thisPart.range[1] - 1, nextPart.range[0] + 1);
        value += nextPart.value;
        raw += nextPart.raw.slice(1, -1);
      }
      this.escape(quote, thisPart.range[0] + 1, thisPart.range[1] - 1);
    }

    const lastPart = parts[parts.length - 1];
    this.overwrite(lastPart.range[1] - 1, lastPart.range[1], quote);

    raw = quote + raw.replace(new RegExp(quote, 'g'), `\\${quote}`) + quote;
    return { type: Syntax.Literal, value, raw };
  }

  buildTemplateString(node: Object, parts: Array<Object>): Object {
    const expressions = [];
    const quasis = [];

    const firstPart = parts[0];
    let cooked = firstPart.value;
    let raw = firstPart.raw.slice(1, -1);
    this.overwrite(firstPart.range[0], firstPart.range[0] + 1, '`');

    parts.forEach(part => this.escape('`', part.range[0] + 1, part.range[1] - 1));

    for (let i = 0; i < parts.length - 1; i++) {
      const thisPart = parts[i];
      const nextPart = parts[i + 1];
      if (isString(nextPart)) {
        cooked += nextPart.value;
        raw += nextPart.raw.slice(1, -1);
      } else {
        expressions.push(nextPart);
        quasis.push({
          type: Syntax.TemplateElement,
          tail: false,
          value: { cooked, raw: raw.replace(/`/g, '\\`') }
        });
        cooked = '';
        raw = '';
      }
      if (isString(thisPart)) {
        if (isString(nextPart)) {
          this.remove(thisPart.range[1] - 1, nextPart.range[0] + 1);
        } else {
          this.overwrite(thisPart.range[1] - 1, nextPart.range[0], '${');
        }
      } else {
        if (isString(nextPart)) {
          this.overwrite(thisPart.range[1], nextPart.range[0] + 1, '}');
        } else {
          this.overwrite(thisPart.range[1], nextPart.range[0], '}${');
        }
      }
    }

    quasis.push({
      type: Syntax.TemplateElement,
      tail: true,
      value: { cooked, raw }
    });

    const lastPart = parts[parts.length - 1];
    if (isString(lastPart)) {
      this.overwrite(lastPart.range[1] - 1, node.range[1], '`');
    } else {
      this.overwrite(lastPart.range[1], node.range[1], '}`');
    }

    return { type: Syntax.TemplateLiteral, expressions, quasis };
  }
}

export function begin(module: Module): Context {
  return new Context(module);
}

export function enter(node: Object, parent: Object, module: Module, context: Context): ?VisitorOption {
  const parts = context.flatten(node);

  if (parts) {
    context.metadata.concatenations.push({
      node: clone(node),
      parts: clone(parts)
    });

    replace(node, context.combine(node, parts));
  }

  return null;
}

function isString(node: Object): boolean {
  if (!node) {
    return false;
  }
  return node.type === Syntax.Literal && typeof node.value === 'string';
}
