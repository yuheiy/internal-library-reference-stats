import path from 'node:path';
import pkg from '../package.json';

// TODO: set the module name to be analyzed
export const targetModuleName = 'antd';

// TODO: set the title of module to be output in `README.md`
export const targetModuleTitle = 'Ant Design';

// TODO: set the URL of the module to be output in `README.md`
export const targetModuleUrl = 'https://github.com/ant-design/ant-design';

export const rootDirectoryPath = path.join(import.meta.dirname, '..');

/** Map<userPackageDirectoryPath, userPackageName> */
export const userPackageNameMap = new Map<string, string>();

// TODO: set the display name of the user packages
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
