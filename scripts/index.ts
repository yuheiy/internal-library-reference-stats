import { globSync } from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import pMap from 'p-map';
import { comparePaths } from './comparers.ts';
import {
  markdownConfig,
  rootDirectoryPath,
  targetModuleName,
} from './config.ts';
import { getSubmodules } from './git.ts';
import { getNamedImportsStats } from './named-imports-stats.ts';
import { format } from './prettier.ts';
import {
  renderByModuleExportName,
  renderByUserPackage,
  renderReadme,
} from './renderers.ts';

async function main() {
  const updatedAt = new Date();

  console.time('namedImportsStats');

  const submodules = await getSubmodules({ cwd: rootDirectoryPath });
  const filePatterns = Array.from(submodules.keys(), (submodulePath) =>
    path.join(submodulePath, '**/*.{js,ts,jsx,tsx}'),
  );
  const filePaths = filePatterns.flatMap(pattern => globSync(pattern)).toSorted(comparePaths);
  const namedImportsStats = getNamedImportsStats(
    filePaths,
    targetModuleName,
  );

  console.timeEnd('namedImportsStats');

  await pMap(
    [
      [markdownConfig.readme.name, renderReadme],
      [markdownConfig.byModuleExportName.name, renderByModuleExportName],
      [markdownConfig.byUserPackage.name, renderByUserPackage],
    ] as const,
    async ([name, render]) => {
      console.time(name);

      const filePath = path.join(rootDirectoryPath, name);
      const content = await render({
        updatedAt,
        namedImportsStats,
      });
      const formattedContent = await format(content, { filepath: filePath });
      await fsPromises.writeFile(filePath, formattedContent);

      console.timeEnd(name);
    },
  );
}

main().catch((e) => {
  throw e;
});
