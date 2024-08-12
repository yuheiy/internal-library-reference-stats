import path from 'node:path';
import pMap from 'p-map';
import invariant from 'tiny-invariant';
import { comparePaths } from './comparers';
import { analyzeModuleImports, type LineRange } from './import-analyzer';
import { memoizedPackageDirectory } from './package';
import { pMapGroupBy } from './promise';

export type NamedImportsStat = {
  sourcePath: string;
  moduleExportName: string;
  lineRange: LineRange;
};

export async function getNamedImportsStats(filePaths: string[], targetModuleName: string) {
  const statsChunks = await pMap(filePaths, async (filePath) => {
    const { namedImports } = await analyzeModuleImports(filePath, targetModuleName);
    return Object.entries(namedImports).map(([moduleExportName, { lineRange }]) => ({
      sourcePath: filePath,
      moduleExportName,
      lineRange,
    }));
  });

  const result: NamedImportsStat[] = statsChunks.reduce((acc, chunk) => [...acc, ...chunk]);
  return result;
}

export function groupByModuleExportName(
  namedImportsStats: NamedImportsStat[],
  ensureKeys: Set<string> = new Set(),
) {
  const result = Map.groupBy(namedImportsStats, ({ moduleExportName }) => moduleExportName);

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
  const result = await pMapGroupBy(namedImportsStats, async ({ sourcePath }) => {
    const directoryPath = await memoizedPackageDirectory({
      cwd: path.dirname(sourcePath),
    });
    invariant(directoryPath);
    return directoryPath;
  });

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
