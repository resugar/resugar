import { NodePath, Node } from '@babel/traverse';
import { Comment } from '@babel/types';

type RecastComment = Comment & {
  leading?: boolean;
  trailing?: boolean;
};

type RecastNode = Node & {
  comments?: Array<RecastComment>;
};

export function replaceWithAndPreserveComments(
  path: NodePath,
  node: Node
): void;
export function replaceWithAndPreserveComments(
  path: NodePath,
  nodes: Array<Node>
): void;
export function replaceWithAndPreserveComments(
  path: NodePath,
  nodeOrNodes: Node | Array<Node>
): void {
  if (Array.isArray(nodeOrNodes)) {
    const firstNode = nodeOrNodes[0];
    const lastNode = nodeOrNodes[nodeOrNodes.length - 1];

    if (firstNode) {
      copyLeadingComments(path.node, firstNode);
    }

    if (lastNode) {
      copyTrailingComments(path.node, lastNode);
    }

    path.replaceWithMultiple(nodeOrNodes);
  } else {
    copyLeadingComments(path.node as RecastNode, nodeOrNodes as RecastNode);
    copyTrailingComments(path.node, nodeOrNodes);
    path.replaceWith(nodeOrNodes);
  }
}

export function addTrailingComment(comment: Comment, to: Node): void {
  const comments: Array<RecastComment> =
    (to as RecastNode).comments || ((to as RecastNode).comments = []);

  comments.push({
    ...comment,
    leading: false,
    trailing: true
  });

  to.trailingComments = comments.filter(comment => comment.trailing);
}

export function addLeadingComment(comment: Comment, to: Node): void {
  const comments: Array<RecastComment> =
    (to as RecastNode).comments || ((to as RecastNode).comments = []);

  comments.push({
    ...comment,
    leading: true,
    trailing: false
  });

  to.leadingComments = comments.filter(comment => comment.leading);
}

export type CommentPredicate = (comment: RecastComment) => boolean;

export function addLeadingOrTrailingComment(
  comment: RecastComment,
  to: Node
): void {
  if (comment.leading) {
    addLeadingComment(comment, to);
  } else if (comment.trailing) {
    addTrailingComment(comment, to);
  }
}

export function copyComments(
  from: Node,
  to: Node,
  shouldCopy: CommentPredicate = () => true,
  addComment = addLeadingOrTrailingComment
): void {
  const fromComments: Array<RecastComment> = (from as RecastNode).comments;

  if (!fromComments || fromComments.length === 0) {
    return;
  }

  for (const comment of fromComments.filter(shouldCopy)) {
    addComment(comment, to);
  }
}

export function copyLeadingComments(
  from: Node,
  to: Node,
  addComment = addLeadingComment
): void {
  copyComments(from, to, comment => comment.leading === true, addComment);
}

export function copyTrailingComments(
  from: Node,
  to: Node,
  addComment = addTrailingComment
): void {
  copyComments(from, to, comment => comment.trailing === true, addComment);
}
