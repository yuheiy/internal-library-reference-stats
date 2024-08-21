import path from 'node:path';
import pMemoize from 'p-memoize';
import invariant from 'tiny-invariant';
import type { LineRange } from './import-analyzer';
import { pExec, pGitconfig } from './promise';

/**
 * @example
 * // returns Map {
 * //   '<rootDir>/user-repositories/foo' => { url: 'https://github.com/yuheiy/foo' },
 * //   '<rootDir>/user-repositories/bar' => { url: 'https://github.com/yuheiy/bar' }
 * // }
 * const submodules = await getSubmodules()
 */
export async function getSubmodules({
  cwd,
}: { cwd?: string | undefined } = {}) {
  cwd ??= process.cwd();

  const config = await pGitconfig(cwd);
  const result = new Map<string, { url: URL }>();

  for (const [name, data] of Object.entries<{ url: string; active?: boolean }>(
    config['submodule'],
  )) {
    if (name === 'active') {
      continue;
    }

    const absolutePath = path.join(cwd, name);
    const url = new URL(data.url);
    result.set(absolutePath, { url });
  }

  return result;
}

async function getCommitSha({ cwd }: { cwd?: string | URL | undefined } = {}) {
  const { stdout } = await pExec('git rev-parse HEAD', {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

const memoizedGetCommitSha = pMemoize(getCommitSha, {
  cacheKey: (args) => JSON.stringify(args[0]),
});

export async function getRepositoryFor(fileOrDirectoryPath: string) {
  const submodules = await getSubmodules();
  const inputPathSegments = fileOrDirectoryPath.split(path.sep);
  const targetSubmodule = Array.from(submodules).find(([submodulePath]) => {
    const submodulePathSegments = submodulePath.split(path.posix.sep);
    return submodulePathSegments.every(
      (segment, i) => segment === inputPathSegments[i],
    );
  });
  invariant(targetSubmodule);
  const [submodulePath, { url }] = targetSubmodule;

  return {
    path: submodulePath,
    url,
    name: url.pathname.slice(1),
    commitSha: await memoizedGetCommitSha({ cwd: submodulePath }),
  };
}

export async function getGithubUrlFor(
  fileOrDirectoryPath: string,
  lineRange?: LineRange | undefined,
) {
  const repository = await getRepositoryFor(fileOrDirectoryPath);
  const relativePath = path.relative(repository.path, fileOrDirectoryPath);

  const url = new URL(
    `${repository.url}/tree/${repository.commitSha}/${relativePath}`,
  );
  url.hash = lineRange ? `L${lineRange.start}-L${lineRange.end}` : '';
  return url;
}
