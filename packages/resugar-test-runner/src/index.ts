import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PluginItem } from '@babel/core';
import { transform as codemodTransform } from '@codemod/core';

export function defineTestSuites(
  fixturesPath: string,
  plugins: ReadonlyArray<PluginItem> = []
): void {
  const fixtures = new Set<string>();

  for (const fixturePath of readdirSync(fixturesPath)) {
    const fixture = fixturePath.replace(/\.(input|output)\.js$/, '');
    fixtures.add(fixture);
  }

  for (const fixture of fixtures) {
    const input = readFileSync(
      join(fixturesPath, `${fixture}.input.js`),
      'utf8'
    );
    const match = input.match(/^\/\/ config=([^\n]*)/);
    const config = match && JSON.parse(match[1]);

    test(fixture.replace(/-/g, ' '), () => {
      const output = readFileSync(
        join(fixturesPath, `${fixture}.output.js`),
        'utf8'
      );

      expect(transform(input, config)).toEqual(output);
    });

    test(`${fixture.replace(/-/g, ' ')} (idempotent)`, () => {
      const once = transform(input, config);
      const twice = transform(once, config);

      expect(twice).toEqual(once);
    });
  }

  function transform(code: string, config?: any): string {
    const result = codemodTransform(code, {
      plugins: [...plugins.map(plugin => (config ? [plugin, config] : plugin))]
    });

    if (!result || !result.code) {
      throw new Error(`transform returned no code`);
    }

    return result.code;
  }
}
