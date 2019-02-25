import * as Babel from '@babel/core';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import convertStringEscaping from './convertStringEscaping';
import { Token } from '@resugar/extra-types';

export default function({ types: t }: typeof Babel): Babel.PluginObj {
  let tokens!: Array<Token>;

  return {
    name: '@resugar/codemod-strings-template',
    visitor: {
      Program(path: NodePath<t.Program>): void {
        tokens = (path.parent as t.File).tokens;
      },

      BinaryExpression(path: NodePath<t.BinaryExpression>): void {
        let { node } = path;
        let parts = flatten(node);

        if (parts) {
          path.replaceWith(combine(parts));
        }
      }
    }
  };

  interface StringLiteralWithMetadata {
    node: t.StringLiteral;
    prefix: string;
    suffix: string;
  }

  function flatten(node: t.Node): Array<t.StringLiteral> | null {
    if (!t.isBinaryExpression(node) || node.operator !== '+') {
      return null;
    }

    if (node.loc!.start.line !== node.loc!.end.line) {
      return null;
    }

    let { left, right } = node;

    // A string ending with \0 could make an octal literal if combined with
    // the next string, so just ignore it.
    if (
      (t.isStringLiteral(left) && left.value.endsWith('\0')) ||
      (t.isStringLiteral(right) && right.value.endsWith('\0'))
    ) {
      return null;
    }

    if (t.isStringLiteral(left) && t.isStringLiteral(right)) {
      // This is the root.
      return [left, right];
    } else if (t.isStringLiteral(right)) {
      // We need to go deeper.
      let flattenedLeft = flatten(left);

      if (!flattenedLeft) {
        return null;
      }

      return [...flattenedLeft, right];
    } else {
      return null;
    }
  }

  function combine(
    parts: Array<t.StringLiteral>
  ): t.StringLiteral | t.TemplateLiteral {
    let annotatedParts = parts.map((part, i) => {
      let previousPart = parts[i - 1];
      let nextPart = parts[i + 1];
      let annotatedPart: StringLiteralWithMetadata = {
        node: part,
        prefix: '',
        suffix: ''
      };

      if (previousPart) {
        let [, prefix] = insignificantContentSeparatedByPlus(
          previousPart,
          part
        );
        annotatedPart.prefix = prefix.replace(/^\s*/, '');
      }

      if (nextPart) {
        let [suffix] = insignificantContentSeparatedByPlus(part, nextPart);
        annotatedPart.suffix = suffix.replace(/\s*$/, '');
      }

      return annotatedPart;
    });

    if (
      annotatedParts.every(
        part => t.isStringLiteral(part.node) && !part.prefix && !part.suffix
      )
    ) {
      return combineStrings(parts);
    } else {
      return buildTemplateString(annotatedParts);
    }
  }

  function combineStrings(parts: Array<t.StringLiteral>): t.StringLiteral {
    let { value } = parts[0];

    for (let i = 0; i < parts.length; i++) {
      let nextPart = parts[i + 1];
      if (nextPart) {
        value += nextPart.value;
      }
    }

    return t.stringLiteral(value);
  }

  function buildTemplateString(
    parts: Array<StringLiteralWithMetadata>
  ): t.TemplateLiteral {
    let expressions: Array<t.StringLiteral> = [];
    let quasis: Array<t.TemplateElement> = [];

    let cooked = '';
    let raw = '';

    parts.forEach(({ node, prefix, suffix }, i) => {
      if (prefix || suffix || !t.isStringLiteral(node)) {
        // This one has to be an interpolated expression.
        expressions.push(node);
        quasis.push(t.templateElement({ cooked, raw }, false));
        cooked = '';
        raw = '';
      } else {
        // This one can become a quasi,
        cooked += node.value;
        raw += convertStringEscaping(
          (node as any).extra.raw[0],
          '`',
          (node as any).extra.raw.slice(1, -1)
        );
      }
    });

    quasis.push(t.templateElement({ cooked, raw }, true));

    return t.templateLiteral(quasis, expressions);
  }

  function insignificantContentSeparatedByPlus(
    left: t.StringLiteral,
    right: t.StringLiteral
  ): [string, string] {
    let leftComments: Array<string> = [];
    let rightComments: Array<string> = [];
    let hasFoundPlusToken = false;

    for (const token of tokens) {
      if (token.start < left.end! || token.start >= right.start!) {
        continue;
      }

      if (
        typeof token.type === 'object' &&
        token.type.label === '+/-' &&
        token.value === '+'
      ) {
        hasFoundPlusToken = true;
      } else if (token.type === 'CommentBlock') {
        let expandedSource = token.value;
        (hasFoundPlusToken ? rightComments : leftComments).push(expandedSource);
      }
    }

    return [leftComments.join(''), rightComments.join('')];
  }
}
