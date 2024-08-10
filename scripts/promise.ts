import gitconfig from 'gitconfiglocal';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

export const pExec = promisify(exec);
export const pGitconfig = promisify(gitconfig);

export async function pMapGroupBy<K, T>(
  items: Iterable<T>,
  callbackFn: (item: T, index: number) => K | Promise<K>,
) {
  const map = new Map<K, T[]>();
  let k = 0;
  for (const value of items) {
    const key = await callbackFn(value, k++);
    if (!map.has(key)) map.set(key, [value]);
    else map.get(key)!.push(value);
  }
  return map;
}
