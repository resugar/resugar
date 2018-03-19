import { Node, NodePath } from 'babel-traverse';

export { Node, NodePath };

type Plugin = {
  name: string,
  description: string,
};

type DeclarationsBlockScopeOptions = {
  disableConst?: boolean | ((path: NodePath<Node>) => boolean),
};

type ModulesCommonJSOptions = {
  forceDefaultExport?: boolean,
  safeFunctionIdentifiers?: Array<string>,
};

type Options = {
  plugins?: Array<Plugin>,
  validate?: boolean,
  'declarations.block-scope'?: DeclarationsBlockScopeOptions,
  'modules.commonjs'?: ModulesCommonJSOptions,
};

type Warning = {
  node: Node,
  type: string,
  message: string
};

type RenderedModule = {
  ast: Node,
  code: string,
  metadata: Object,
  warnings: Array<Warning>,
};

export function run(args: Array<string>): void;
export const allPlugins: Array<Plugin>;
export function convert(source: string, options?: Options): RenderedModule;
