import * as t from '@babel/types';
import cleanNode from '../utils/cleanNode.js';
import type Module from '../module';
import type { Node, Path, Visitor } from '../types';
import convertStringEscaping from '../utils/convertStringEscaping';

export const name = 'strings.template';
export const description = 'Transforms manual string concatenation into template strings.';

export function visitor(module: Module): Visitor {
  let meta = metadata(module);

  return {
    BinaryExpression(path: Path) {
      let { node } = path;
      let parts = flatten(node);

      if (parts) {
        meta.concatenations.push({
          node: cleanNode(node),
          parts: parts.map(cleanNode)
        });

        path.replaceWith(combine(module, node, parts));
      }
    }
  }
}

function flatten(node: Object): ?Array<Object> {
  if (!t.isBinaryExpression(node) || node.operator !== '+') {
    return null;
  }

  if (node.loc.start.line !== node.loc.end.line) {
    return null;
  }

  let { left, right } = node;

  // A string ending with \0 could make an octal literal if combined with
  // the next string, so just ignore it.
  if (t.isStringLiteral(left) && left.value.endsWith('\0') ||
      t.isStringLiteral(right) && right.value.endsWith('\0')) {
    return null;
  }

  if (t.isStringLiteral(left)) {
    // This is the root.
    return [left, right];
  } else {
    // We need to go deeper.
    let flattenedLeft = flatten(left);

    if (!flattenedLeft) {
      return null;
    }

    return [...flattenedLeft, right];
  }
}

function combine(module: Module, node: Node, parts: Array<Object>): Node {
  let annotatedParts = parts.map((part, i) => {
    let previousPart = parts[i - 1];
    let nextPart = parts[i + 1];
    let annotatedPart = {
      node: part,
      prefix: '',
      suffix: ''
    };

    if (previousPart) {
      let [ , prefix ] = insignificantContentSeparatedByPlus(module, previousPart, part);
      annotatedPart.prefix = prefix.replace(/^\s*/, '');
    }

    if (nextPart) {
      let [ suffix ] = insignificantContentSeparatedByPlus(module, part, nextPart);
      annotatedPart.suffix = suffix.replace(/\s*$/, '');
    }

    return annotatedPart;
  });

  if (annotatedParts.every(part => t.isStringLiteral(part.node) && !part.prefix && !part.suffix)) {
    return combineStrings(module, parts);
  } else {
    return buildTemplateString(module, node, annotatedParts);
  }
}

function combineStrings(module, parts: Array<Object>): Object {
  let quote = module.source.charAt(parts[0].start);
  let { value } = parts[0];

  for (let i = 0; i < parts.length; i++) {
    let thisPart = parts[i];
    let nextPart = parts[i + 1];
    if (nextPart) {
      // Remove the space between the strings.
      module.magicString.remove(thisPart.end - 1, nextPart.start + 1);
      value += nextPart.value;
    }
    let thisPartQuote = module.source.charAt(parts[i].start);
    let originalString = module.magicString.slice(thisPart.start + 1, thisPart.end - 1);
    let convertedString = convertStringEscaping(thisPartQuote, quote, originalString);
    if (originalString !== convertedString) {
      module.magicString.overwrite(thisPart.start + 1, thisPart.end - 1, convertedString);
    }
  }

  let lastPart = parts[parts.length - 1];
  module.magicString.overwrite(lastPart.end - 1, lastPart.end, quote);

  return t.stringLiteral(value);
}

function buildTemplateString(module: Module, node: Object, parts: Array<Object>): Object {
  let expressions = [];
  let quasis = [];

  let firstPart = parts[0];
  let firstNode = firstPart.node;
  let cooked = '';
  let raw = '';

  module.magicString.appendLeft(firstNode.start, '`');

  parts.forEach(({ node, prefix, suffix }, i) => {
    if (prefix || suffix || !t.isStringLiteral(node)) {
      // This one has to be an interpolated expression.
      module.magicString.appendRight(node.start, `\${${prefix}`);
      module.magicString.appendLeft(node.end, `${suffix}}`);
      expressions.push(node);
      quasis.push(t.templateElement(
        { cooked, raw },
        false
      ));
      cooked = '';
      raw = '';
    } else {
      // This one can become a quasi,
      cooked += node.value;
      raw += convertStringEscaping(node.extra.raw[0], '`', node.extra.raw.slice(1, -1));
      module.magicString.remove(node.start, node.start + 1);
      module.magicString.remove(node.end - 1, node.end);
      let thisPartQuote = module.source.charAt(node.start);
      let originalString = module.magicString.slice(node.start + 1, node.end - 1);
      let convertedString = convertStringEscaping(thisPartQuote, '`', originalString);
      if (originalString !== convertedString) {
        module.magicString.overwrite(node.start + 1, node.end - 1, convertedString);
      }
    }

    let nextPart = parts[i + 1];

    if (nextPart) {
      module.magicString.remove(node.end, nextPart.node.start);
    }
  });

  quasis.push(t.templateElement(
    { cooked, raw },
    true
  ));

  let lastPart = parts[parts.length - 1];

  if (lastPart.node.end === node.end) {
    module.magicString.appendRight(
      node.end,
      '`'
    );
  } else {
    module.magicString.overwrite(
      lastPart.node.end,
      node.end,
      '`'
    );
  }

  return t.templateLiteral(quasis, expressions);
}

function insignificantContentSeparatedByPlus(module: Module, left: Node, right: Node): Array<string> {
  let tokens = module.tokensInRange(left.end, right.start);
  let leftComments = [];
  let rightComments = [];
  let hasFoundPlusToken = false;
  let last = left;

  tokens.forEach((token, i) => {
    let next = tokens[i + 1] || right;
    if (token.type.label === '+/-' && token.value === '+') {
      hasFoundPlusToken = true;
    } else if (token.type === 'CommentBlock') {
      let expandedSource = module.source.slice(last.end, next.start);
      (hasFoundPlusToken ? rightComments : leftComments).push(expandedSource);
    }
    last = token;
  });

  return [leftComments.join(''), rightComments.join('')];
}

type Metadata = {
  concatenations: Array<{ node: Object }>
};

function metadata(module: Module): Metadata {
  if (!module.metadata[name]) {
    module.metadata[name] = { concatenations: [] };
  }
  return module.metadata[name];
}
