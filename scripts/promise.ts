export async function promisedMapGroupBy<K, T>(
  items: Iterable<T>,
  callbackFn: (item: T, index: number) => Promise<K>,
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
