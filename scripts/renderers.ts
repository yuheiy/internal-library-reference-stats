import GithubSlugger from 'github-slugger';
import path from 'node:path';
import pMap from 'p-map';
import {
  linkMode,
  markdownConfig,
  rootDirectoryPath,
  targetModuleName,
  targetModuleTitle,
  targetModuleUrl,
  userPackageNameMap,
} from './config';
import { getGithubUrlFor, getRepositoryFor, getSubmodules } from './git';
import type { LineRange } from './import-analyzer';
import {
  groupByModuleExportName,
  groupByUserPackage,
  type NamedImportsStat,
} from './named-imports-stats';
import { getDependencyVersion } from './package';

async function getUserPackageName(directoryPath: string) {
  const configuredName = userPackageNameMap.get(directoryPath);
  if (configuredName !== undefined) {
    return configuredName;
  }

  const repository = await getRepositoryFor(directoryPath);
  return path.relative(path.join(repository.path, '..'), directoryPath);
}

async function getFileOrDirectoryLink(
  fileOrDirectoryPath: string,
  lineRange?: LineRange | undefined,
) {
  switch (linkMode) {
    case 'github':
      return await getGithubUrlFor(fileOrDirectoryPath, lineRange);

    case 'relative': {
      const relativePath = path.relative(
        rootDirectoryPath,
        fileOrDirectoryPath,
      );
      const hash = lineRange ? `#L${lineRange.start}` : '';
      return relativePath + hash;
    }

    default:
      throw new TypeError(linkMode satisfies never);
  }
}

function renderReferencesHeadingContent(
  name: string,
  namedImportsStats: NamedImportsStat[],
) {
  return `${name} (${namedImportsStats.length})`;
}

async function renderMeta({ updatedAt }: { updatedAt: Date }) {
  const submodules = await getSubmodules({ cwd: rootDirectoryPath });
  const formattedDate = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'long',
    timeStyle: 'long',
    timeZone: 'Asia/Tokyo',
  }).format(updatedAt);

  const lines: string[] = [
    '- 対象データ',
    ...(await pMap(submodules.keys(), async (submodulePath) => {
      const { name, url, commitSha } = await getRepositoryFor(submodulePath);
      return `  - [${name}](${url}): [${commitSha}](${url}/commit/${commitSha})`;
    })),
    `- データ取得日時: ${formattedDate}`,
  ];

  return lines.join('\n');
}

async function renderUserPackageMeta(directoryPath: string) {
  const repository = await getRepositoryFor(directoryPath);
  const userPackagePath = path.relative(repository.path, directoryPath);
  const userPackageLink = await getFileOrDirectoryLink(directoryPath);
  const version = await getDependencyVersion(targetModuleName, {
    cwd: directoryPath,
  });

  const lines: string[] = [
    `- 対象リポジトリ: [${repository.name}](${repository.url})`,
    `- 対象ディレクトリ: [${userPackagePath !== '' ? userPackagePath : '.'}](${userPackageLink})`,
    `- ${targetModuleName}のバージョン: ${version ?? '不明'}`,
  ];

  return lines.join('\n');
}

function concatChunksWithBlanks(...chunks: string[][]): string[] {
  return chunks.reduce((acc, lines) => [...acc, '', ...lines]);
}

export async function renderReadme({
  updatedAt,
  namedImportsStats,
}: {
  updatedAt: Date;
  namedImportsStats: NamedImportsStat[];
}) {
  const byUserPackage = await groupByUserPackage(namedImportsStats);
  const byModuleExportName = groupByModuleExportName(
    namedImportsStats,
    new Set(Object.keys(await import(targetModuleName))),
  );

  const columns: string[] = await (async () => {
    const slugger = new GithubSlugger();
    const userPackageHeaders = await pMap(
      byUserPackage,
      async ([userPackageDirectoryPath, namedImportsStats]) => {
        const name = await getUserPackageName(userPackageDirectoryPath);
        const subpageHeading = renderReferencesHeadingContent(
          name,
          namedImportsStats,
        );
        return `[${name}](${markdownConfig.byUserPackage.name}#${slugger.slug(subpageHeading)})`;
      },
    );
    return [...userPackageHeaders, '合計'];
  })();

  const rows: (string | number)[][] = await (async () => {
    const slugger = new GithubSlugger();
    const rowsPerModuleExportName = await pMap(
      byModuleExportName,
      async ([moduleExportName, namedImportsStats]) => {
        const subpageHeading = renderReferencesHeadingContent(
          moduleExportName,
          namedImportsStats,
        );
        const header = `[${moduleExportName}](${markdownConfig.byModuleExportName.name}#${slugger.slug(subpageHeading)})`;
        const totalPerUserPackage = Array.from(
          (
            await groupByUserPackage(
              namedImportsStats,
              new Set(byUserPackage.keys()),
            )
          ).values(),
          (namedImportsStats) => namedImportsStats.length,
        );
        const lines: (string | number)[] = [
          header,
          ...totalPerUserPackage,
          namedImportsStats.length,
        ];
        return lines;
      },
    );
    const totalPerUserPackage = Array.from(
      byUserPackage.values(),
      (namedImportsStats) => namedImportsStats.length,
    );
    const totalRow = [
      '合計',
      ...totalPerUserPackage,
      totalPerUserPackage.reduce((acc, size) => acc + size),
    ];
    return [...rowsPerModuleExportName, totalRow];
  })();

  const lines: string[] = [
    `# ${markdownConfig.readme.title}`,
    '',
    `[${targetModuleTitle}](${targetModuleUrl})から提供されているモジュールの参照箇所を自動解析して掲載しています。`,
    '',
    await renderMeta({ updatedAt }),
    '',
    '<!-- prettier-ignore -->',
    `|   | ${columns.join(' | ')} |`,
    `| - | ${columns.map(() => '-:').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
    `- [${markdownConfig.byModuleExportName.title}](${markdownConfig.byModuleExportName.name})`,
    `- [${markdownConfig.byUserPackage.title}](${markdownConfig.byUserPackage.name})`,
  ];

  return lines.join('\n') + '\n';
}

export async function renderByModuleExportName({
  updatedAt,
  namedImportsStats,
}: {
  updatedAt: Date;
  namedImportsStats: NamedImportsStat[];
}) {
  const byModuleExportName = groupByModuleExportName(
    namedImportsStats,
    new Set(Object.keys(await import(targetModuleName))),
  );
  const byReferenced = new Map(
    Array.from(byModuleExportName).filter(
      ([, namedImportsStats]) => namedImportsStats.length > 0,
    ),
  );
  const byUnreferenced = new Map(
    Array.from(byModuleExportName).filter(
      ([, namedImportsStats]) => namedImportsStats.length === 0,
    ),
  );

  const sectionChunks = await pMap(
    Array.from(byReferenced).toSorted(([, a], [, b]) => b.length - a.length),
    async ([moduleExportName, namedImportsStats]) => {
      const heading = renderReferencesHeadingContent(
        moduleExportName,
        namedImportsStats,
      );
      const sectionChunks = await pMap(
        Array.from(await groupByUserPackage(namedImportsStats)).toSorted(
          ([, a], [, b]) => b.length - a.length,
        ),
        async ([userPackageDirectoryPath, namedImportsStats]) => {
          const name = await getUserPackageName(userPackageDirectoryPath);
          const heading = renderReferencesHeadingContent(
            name,
            namedImportsStats,
          );
          const references = await pMap(
            namedImportsStats,
            async ({ sourcePath, lineRange }) => {
              const relativePath = path.relative(
                userPackageDirectoryPath,
                sourcePath,
              );
              const link = await getFileOrDirectoryLink(sourcePath, lineRange);
              return `- [${relativePath}](${link})`;
            },
          );
          const lines: string[] = [
            `### ${heading}`,
            '',
            await renderUserPackageMeta(userPackageDirectoryPath),
            '',
            '参照箇所:',
            '',
            ...references,
          ];
          return lines;
        },
      );
      const lines: string[] = [
        `## ${heading}`,
        '',
        ...concatChunksWithBlanks(...sectionChunks),
      ];
      return lines;
    },
  );

  let lines: string[] = [
    `# ${markdownConfig.byModuleExportName.title}`,
    '',
    await renderMeta({ updatedAt }),
    '',
    ...concatChunksWithBlanks(...sectionChunks),
  ];

  if (byUnreferenced.size > 0) {
    const unreferencedSection = [
      '## 未参照のモジュール',
      '',
      ...Array.from(
        byUnreferenced.keys(),
        (moduleExportName) => `- ${moduleExportName}`,
      ),
    ];
    lines = concatChunksWithBlanks(lines, unreferencedSection);
  }

  return lines.join('\n') + '\n';
}

export async function renderByUserPackage({
  updatedAt,
  namedImportsStats,
}: {
  updatedAt: Date;
  namedImportsStats: NamedImportsStat[];
}) {
  const byUserPackage = await groupByUserPackage(namedImportsStats);

  const sectionChunks = await pMap(
    Array.from(byUserPackage).toSorted(([, a], [, b]) => b.length - a.length),
    async ([userPackageDirectoryPath, namedImportsStats]) => {
      const name = await getUserPackageName(userPackageDirectoryPath);
      const heading = renderReferencesHeadingContent(name, namedImportsStats);
      const sectionChunks = await pMap(
        Array.from(groupByModuleExportName(namedImportsStats)).toSorted(
          ([, a], [, b]) => b.length - a.length,
        ),
        async ([moduleExportName, namedImportsStats]) => {
          const heading = renderReferencesHeadingContent(
            moduleExportName,
            namedImportsStats,
          );
          const references = await pMap(
            namedImportsStats,
            async ({ sourcePath, lineRange }) => {
              const relativePath = path.relative(
                userPackageDirectoryPath,
                sourcePath,
              );
              const link = await getFileOrDirectoryLink(sourcePath, lineRange);
              return `- [${relativePath}](${link})`;
            },
          );
          const lines: string[] = [`### ${heading}`, '', ...references];
          return lines;
        },
      );
      const lines: string[] = [
        `## ${heading}`,
        '',
        await renderUserPackageMeta(userPackageDirectoryPath),
        '',
        ...concatChunksWithBlanks(...sectionChunks),
      ];
      return lines;
    },
  );

  const lines: string[] = [
    `# ${markdownConfig.byUserPackage.title}`,
    '',
    await renderMeta({ updatedAt }),
    '',
    ...concatChunksWithBlanks(...sectionChunks),
  ];

  return lines.join('\n') + '\n';
}
