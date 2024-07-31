import path from 'node:path';
import pkg from '../package.json';

export const targetModuleName = 'antd';
export const targetModuleTitle = 'Ant Design';
export const targetModuleUrl = 'https://github.com/ant-design/ant-design';

export const rootDirectoryPath = path.join(import.meta.dirname, '..');

/** Map<userPackageDirectoryPath, userPackageName> */
export const userPackageNameMap = new Map<string, string>();

// prettier-ignore
for (const [directoryPath, name] of [
  [
    '../user-repositories/internal-library-reference-stats-user-a/systems/plum/packages/front',
    '梅',
  ],
  [
    '../user-repositories/internal-library-reference-stats-user-a/systems/shiratama/packages/front',
    '白玉',
  ],
  [
    '../user-repositories/internal-library-reference-stats-user-a/systems/vinegar/packages/front',
    '酢',
  ],
  [
    '../user-repositories/internal-library-reference-stats-user-b',
    'User B',
  ],
] as const) {
  const absolutePath = path.join(import.meta.dirname, directoryPath);
  userPackageNameMap.set(absolutePath, name);
}

export const markdownConfig = {
  readme: {
    name: 'README.md',
    title: pkg.name,
  },
  byModuleExportName: {
    name: 'by-module-export-name.md',
    title: '提供モジュールごとの集計',
  },
  byUserPackage: {
    name: 'by-user-package.md',
    title: 'ユーザーのパッケージごとの集計',
  },
} as const;
