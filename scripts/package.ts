import pMemoize from 'p-memoize';
import { packageDirectory } from 'package-directory';
import { readPackageUp } from 'read-package-up';
import { readPnpmWorkspaceUp } from './read-pnpm-workspace-up.ts';

export const memoizedPackageDirectory = pMemoize(packageDirectory, {
  cacheKey: (args) => JSON.stringify(args[0]),
});

const memoizedReadPackageUp = pMemoize(readPackageUp, {
  cacheKey: (args) => JSON.stringify(args[0]),
});

const memoizedReadPnpmWorkspaceUp = pMemoize(readPnpmWorkspaceUp, {
  cacheKey: (args) => JSON.stringify(args[0]),
});

export async function getDependencyVersion(
  name: string,
  { cwd }: { cwd?: string | undefined } = {},
) {
  if (!cwd) {
    return;
  }

  const packageResult = await memoizedReadPackageUp({ cwd });

  if (!packageResult) {
    return;
  }

  const { packageJson } = packageResult;

  const version =
    packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];

  if (!version?.startsWith('catalog:')) {
    return version;
  }

  // Resolve catalog reference
  const pnpmWorkspaceResult = await memoizedReadPnpmWorkspaceUp({ cwd });

  if (!pnpmWorkspaceResult) {
    return version;
  }

  const { pnpmWorkspace } = pnpmWorkspaceResult;

  const catalogKey = version.slice('catalog:'.length);
  const catalogVersion = catalogKey
    ? pnpmWorkspace.catalogs?.[catalogKey]?.[name]
    : pnpmWorkspace.catalog?.[name];

  return catalogVersion ?? version;
}
