import { isNode, NODE_FIELDS } from '@babel/types';
import type { Node } from '../types.js';
import { inspect } from 'util';

export default function cleanNode(node: Node): Node {
  if (!isNode(node)) {
    throw new Error(`node must be a valid node type, got: ${inspect(node)}`);
  }

  let result = Object.create(null);
  let fields = NODE_FIELDS[node.type];

  result.type = node.type;

  Object.keys(fields).forEach(field => {
    if (field in node) {
      let value = node[field];

      if (isNode(value)) {
        result[field] = cleanNode(value);
      } else if (Array.isArray(value)) {
        result[field] = value.map(element => isNode(element) ? cleanNode(element) : element);
      } else {
        result[field] = value;
      }
    } else {
      result[field] = fields[field].default;
    }
  });

  return result;
}

