import codemodDeclarationsBlockScope from '../../packages/resugar-codemod-declarations-block-scope';
import codemodFunctionsArrow from '../../packages/resugar-codemod-functions-arrow';
import codemodModulesCommonJS from '../../packages/resugar-codemod-modules-commonjs';
import codemodObjectsConcise from '../../packages/resugar-codemod-objects-concise';
import codemodObjectsDestructuring from '../../packages/resugar-codemod-objects-destructuring';
import codemodObjectsShorthand from '../../packages/resugar-codemod-objects-shorthand';
import codemodStringsTemplate from '../../packages/resugar-codemod-strings-template';
import { transform } from '@codemod/core';

export default async function main(
  args: ReadonlyArray<string>,
  stdin: typeof process.stdin,
  stdout: typeof process.stdout
): Promise<number> {
  const input = await readStream(stdin);
  stdout.write(transform(input, {
    plugins: [
      codemodDeclarationsBlockScope,
      codemodFunctionsArrow,
      codemodModulesCommonJS,
      codemodObjectsConcise,
      codemodObjectsDestructuring,
      codemodObjectsShorthand,
      codemodStringsTemplate
    ]
  }).code as string);
  return 0;
}

async function readStream(
  input: NodeJS.ReadStream,
  encoding = 'utf8'
): Promise<string> {
  return new Promise(resolve => {
    let data = '';

    input.setEncoding(encoding);

    input.on('readable', () => {
      let chunk;

      while ((chunk = input.read()) !== null) {
        data += chunk;
      }
    });

    input.on('end', () => {
      resolve(data);
    });
  });
}
