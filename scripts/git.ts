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
export async function getSubmodules({ cwd }: { cwd?: string | undefined } = {}) {
  cwd ??= process.cwd();

  const config = await pGitconfig(cwd);
  const result = new Map<string, { url: string }>();

  for (const [name, { url }] of Object.entries<{ url: string; active?: boolean }>(
    config['submodule'],
  )) {
    if (name === 'active') {
      continue;
    }

    if (!URL.canParse(url)) {
      // Throw an error if the SSH protocol value is set.
      throw new Error(`${url} is invalid value. Use HTTP protocol for submodule URLs.`);
    }

    const absolutePath = path.join(cwd, name);
    result.set(absolutePath, { url });
  }

  return result;
}

async function getCommitSha({ cwd }: { cwd?: string | URL | undefined } = {}) {
  const { stdout } = await pExec('git rev-parse HEAD', { cwd, encoding: 'utf8' });
  return stdout.trim();
}

const memoizedGetCommitSha = pMemoize(getCommitSha, {
  cacheKey: (args) => JSON.stringify(args[0]),
});

export async function getRepositoryFor(fileOrDirectoryPath: string) {
  const submodules = await getSubmodules();
  const inputPathSegments = fileOrDirectoryPath.split(path.sep);
  const targetSubmodule = [...submodules].find(([submodulePath]) => {
    const submodulePathSegments = submodulePath.split(path.sep);
    return submodulePathSegments.every((segment, i) => segment === inputPathSegments[i]);
  });
  invariant(targetSubmodule);
  const [submodulePath, { url }] = targetSubmodule;

  return {
    path: submodulePath,
    url,
    name: new URL(url).pathname.slice(1),
    commitSha: await memoizedGetCommitSha({ cwd: submodulePath }),
  };
}

export async function getGithubUrlFor(
  fileOrDirectoryPath: string,
  lineRange?: LineRange | undefined,
) {
  const repository = await getRepositoryFor(fileOrDirectoryPath);
  const relativePath = path.relative(repository.path, fileOrDirectoryPath);

  let result = `${repository.url}/tree/${repository.commitSha}/${relativePath}`;
  if (lineRange) {
    result += `#L${lineRange.start}-L${lineRange.end}`;
  }
  return result;
}
