import fg from 'fast-glob';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import pMap from 'p-map';
import * as prettier from 'prettier';
import { comparePaths } from './comparers';
import { markdownConfig, rootDirectoryPath } from './config';
import { getSubmodules } from './git';
import { getNamedImportsStats } from './named-imports-stats';
import { renderByModuleExportName, renderByUserPackage, renderReadme } from './renderers';

async function main() {
  const updatedAt = new Date();

  console.time('namedImportsStats');

  const submodules = await getSubmodules();
  const filePatterns = [...submodules.keys()].map((submodulePath) =>
    path.join(submodulePath, '**/*.{js,ts,jsx,tsx}'),
  );
  const filePaths = (await fg.glob(filePatterns)).toSorted(comparePaths);
  const namedImportsStats = await getNamedImportsStats(filePaths);

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
      const options = await prettier.resolveConfig(filePath);
      const formattedContent = await prettier.format(content, {
        ...options,
        filepath: filePath,
      });
      await fsPromises.writeFile(filePath, formattedContent);

      console.timeEnd(name);
    },
  );
}

main().catch((e) => {
  throw e;
});
