import pMemoize from 'p-memoize';
import { packageDirectory } from 'pkg-dir';
import { readPackageUp } from 'read-package-up';

export const memoizedPackageDirectory = pMemoize(packageDirectory, {
  cacheKey: (args) => JSON.stringify(args[0]),
});

const memoizedReadPackageUp = pMemoize(readPackageUp, {
  cacheKey: (args) => JSON.stringify(args[0]),
});

export async function getDependencyVersion(
  name: string,
  { cwd }: { cwd?: string | URL | undefined } = {},
) {
  const result = await memoizedReadPackageUp(cwd ? { cwd } : {});
  return (
    result?.packageJson.dependencies?.[name] ??
    result?.packageJson.devDependencies?.[name]
  );
}
