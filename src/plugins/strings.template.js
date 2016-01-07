import BaseContext from '../context';
import clone from '../utils/clone';
import estraverse from 'estraverse'; // TODO: import { traverse } from 'estraverse';
import groupContentBetweenElements from '../utils/groupContentBetweenElements';
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
    const annotatedParts = parts.map((part, i) => {
      const previousPart = parts[i - 1];
      const nextPart = parts[i + 1];
      const annotatedPart = {
        node: part,
        prefix: '',
        suffix: ''
      };

      if (previousPart) {
        const [ , prefix ] = this.insignificantContentSeparatedByPlus(previousPart, part);
        annotatedPart.prefix = prefix.replace(/^\s*/, '');
      }

      if (nextPart) {
        const [ suffix ] = this.insignificantContentSeparatedByPlus(part, nextPart);
        annotatedPart.suffix = suffix.replace(/\s*$/, '');
      }

      return annotatedPart;
    });

    if (annotatedParts.every(part => isString(part.node) && !part.prefix && !part.suffix)) {
      return this.combineStrings(parts);
    } else {
      return this.buildTemplateString(node, annotatedParts);
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
    const firstNode = firstPart.node;
    let cooked = '';
    let raw = '';
    this.insert(firstNode.range[0], '`');

    parts.forEach(({ node, prefix, suffix }, i) => {
      if (prefix || suffix || !isString(node)) {
        // This one has to be an interpolated expression.
        this.insert(node.range[0], `\${${prefix}`);
        this.insert(node.range[1], `${suffix}}`);
        expressions.push(node);
        quasis.push({
          type: Syntax.TemplateElement,
          tail: false,
          value: { cooked, raw: raw.replace(/`/g, '\\`') }
        });
        cooked = '';
        raw = '';
      } else {
        // This one can become a quasi,
        cooked += node.value;
        raw += node.raw.slice(1, -1);
        this.remove(node.range[0], node.range[0] + 1);
        this.remove(node.range[1] - 1, node.range[1]);
        this.escape('`', ...node.range);
      }

      const nextPart = parts[i + 1];
      if (nextPart) {
        this.remove(node.range[1], nextPart.node.range[0]);
      }
    });

    quasis.push({
      type: Syntax.TemplateElement,
      tail: true,
      value: { cooked, raw }
    });

    this.overwrite(
      parts[parts.length - 1].node.range[1],
      node.range[1],
      '`'
    );

    // TODO: test nested template strings
    //parts.forEach(part => this.escape('`', part.node.range[0] + 1, part.node.range[1] - 1));
    //
    //for (let i = 0; i < parts.length - 1; i++) {
    //  const thisPart = parts[i];
    //  const thisNode = thisPart.node;
    //  const nextPart = parts[i + 1];
    //  const nextNode = nextPart.node;
    //  if (isString(nextNode)) {
    //    cooked += nextNode.value;
    //    raw += nextNode.raw.slice(1, -1);
    //  } else {
    //    expressions.push(nextNode);
    //    quasis.push({
    //      type: Syntax.TemplateElement,
    //      tail: false,
    //      value: { cooked, raw: raw.replace(/`/g, '\\`') }
    //    });
    //    cooked = '';
    //    raw = '';
    //  }
    //  if (isString(thisNode)) {
    //    if (isString(nextNode)) {
    //      this.remove(
    //        thisNode.range[1] - 1,
    //        nextNode.range[0] + 1
    //      );
    //    } else {
    //      this.overwrite(
    //        thisNode.range[1] - 1,
    //        nextNode.range[0],
    //        `\${`
    //      );
    //    }
    //  } else {
    //    if (isString(nextNode)) {
    //      this.overwrite(
    //        thisNode.range[1],
    //        nextNode.range[0] + 1,
    //        `}`
    //      );
    //    } else {
    //      this.overwrite(
    //        thisNode.range[1],
    //        nextNode.range[0],
    //        `}\${`
    //      );
    //    }
    //  }
    //}
    //
    //quasis.push({
    //  type: Syntax.TemplateElement,
    //  tail: true,
    //  value: { cooked, raw }
    //});
    //
    //const lastPart = parts[parts.length - 1];
    //const lastNode = lastPart.node;
    //if (isString(lastNode)) {
    //  this.overwrite(lastNode.range[1] - 1, node.range[1], '`');
    //} else {
    //  this.overwrite(lastNode.range[1], node.range[1], '}`');
    //}

    return { type: Syntax.TemplateLiteral, expressions, quasis };
  }

  insignificantContentSeparatedByPlus(left: Object, right: Object): Array<string> {
    return groupContentBetweenElements(
      [left, ...this.module.tokensBetweenNodes(left, right), right],
      token => token.type === 'Punctuator' && token.value === '+',
      (left, right) => this.slice(left.range[1], right.range[0])
    ).map(strings => strings.join(''));
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
