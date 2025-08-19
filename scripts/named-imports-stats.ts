import {
  scanImportDeclarations,
  type ScannedNamedImportDeclaration,
} from '@yuheiy/import-scanner';
import path from 'node:path';
import invariant from 'tiny-invariant';
import { comparePaths } from './comparers.ts';
import { memoizedPackageDirectory } from './package.ts';
import { pMapGroupBy } from './promise.ts';

export type LineRange = ScannedNamedImportDeclaration['line'];

export type NamedImportsStat = {
  sourcePath: string;
  moduleExportName: string;
  lineRange: LineRange;
};

export function getNamedImportsStats(
  filePaths: string[],
  targetModuleName: string,
) {
  const statsChunks = filePaths.map((filePath) => {
    let importDeclarations;

    try {
      importDeclarations = scanImportDeclarations(filePath);
    } catch (error) {
      console.warn(
        `Failed to scan imports in ${filePath}:`,
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }

    const targetImports = importDeclarations.filter(
      (declaration) =>
        declaration.moduleSpecifierValue === targetModuleName &&
        declaration.details.type === 'named_imports',
    );

    const stats: NamedImportsStat[] = [];

    for (const importDeclaration of targetImports) {
      const lineRange: LineRange = {
        start: importDeclaration.line.start,
        end: importDeclaration.line.end,
      };

      if (importDeclaration.details.type === 'named_imports') {
        for (const element of importDeclaration.details.elements) {
          stats.push({
            sourcePath: filePath,
            moduleExportName: element.moduleExportName,
            lineRange,
          });
        }
      }
    }

    return stats;
  });

  const result: NamedImportsStat[] = statsChunks.reduce((acc, chunk) => [
    ...acc,
    ...chunk,
  ]);
  return result;
}

export function groupByModuleExportName(
  namedImportsStats: NamedImportsStat[],
  ensureKeys: Set<string> = new Set(),
) {
  const result = Map.groupBy(
    namedImportsStats,
    ({ moduleExportName }) => moduleExportName,
  );

  for (const key of ensureKeys) {
    if (!result.has(key)) {
      result.set(key, []);
    }
  }

  const sortedResult = new Map(
    Array.from(result).toSorted(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    ),
  );
  return sortedResult;
}

export async function groupByUserPackage(
  namedImportsStats: NamedImportsStat[],
  ensureKeys: Set<string> = new Set(),
) {
  const result = await pMapGroupBy(
    namedImportsStats,
    async ({ sourcePath }) => {
      const directoryPath = await memoizedPackageDirectory({
        cwd: path.dirname(sourcePath),
      });
      invariant(directoryPath);
      return directoryPath;
    },
  );

  for (const key of ensureKeys) {
    if (!result.has(key)) {
      result.set(key, []);
    }
  }

  const sortedResult = new Map(
    Array.from(result).toSorted(([a], [b]) =>
      comparePaths(path.join(a, 'package.json'), path.join(b, 'package.json')),
    ),
  );
  return sortedResult;
}
