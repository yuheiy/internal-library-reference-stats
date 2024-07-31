import assert from 'node:assert';
import path from 'node:path';
import test from 'node:test';
import { analyzeModuleImports } from './import-analyzer';

test('analyzeModuleImports', async (t) => {
  for (const [name, expected] of [
    [
      'defaultImport',
      {
        defaultImport: {
          lineRange: {
            start: 3,
            end: 3,
          },
        },
        namedImports: {},
        namespacedImport: null,
        sideEffectImport: null,
      },
    ],
    [
      'namedImports',
      {
        defaultImport: null,
        namedImports: {
          export1: {
            lineRange: {
              start: 3,
              end: 3,
            },
          },
          export2: {
            lineRange: {
              start: 3,
              end: 3,
            },
          },
          export3: {
            lineRange: {
              start: 5,
              end: 5,
            },
          },
        },
        namespacedImport: null,
        sideEffectImport: null,
      },
    ],
    [
      'namespacedImport',
      {
        defaultImport: null,
        namedImports: {},
        namespacedImport: {
          lineRange: {
            start: 2,
            end: 2,
          },
        },
        sideEffectImport: null,
      },
    ],
    [
      'sideEffectImport',
      {
        defaultImport: null,
        namedImports: {},
        namespacedImport: null,
        sideEffectImport: {
          lineRange: {
            start: 3,
            end: 3,
          },
        },
      },
    ],
  ] as const) {
    await t.test(name, async () => {
      const filePath = path.join(import.meta.dirname, `./__fixtures__/${name}.ts`);
      const targetModuleName = 'module-name';
      const actual = await analyzeModuleImports(filePath, targetModuleName);
      assert.deepStrictEqual(actual, expected);
    });
  }
});
