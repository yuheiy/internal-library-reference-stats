import fg from 'fast-glob';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import pMap from 'p-map';
import { comparePaths } from './comparers';
import { markdownConfig, rootDirectoryPath, targetModuleName } from './config';
import { getSubmodules } from './git';
import { getNamedImportsStats } from './named-imports-stats';
import { format } from './prettier';
import { renderByModuleExportName, renderByUserPackage, renderReadme } from './renderers';

async function main() {
  const updatedAt = new Date();

  console.time('namedImportsStats');

  const submodules = await getSubmodules({ cwd: rootDirectoryPath });
  const filePatterns = [...submodules.keys()].map((submodulePath) =>
    path.join(submodulePath, '**/*.{js,ts,jsx,tsx}'),
  );
  const filePaths = (await fg.glob(filePatterns)).toSorted(comparePaths);
  const namedImportsStats = await getNamedImportsStats(filePaths, targetModuleName);

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
