/** Select only a child's tree from a POSIX pid/ppid snapshot, descendants before the child. */
export const processTree = (snapshot: string, root: number): number[] => {
  const children = new Map<number, number[]>();
  for (const line of snapshot.split('\n')) {
    if (!/^\s*\d+\s+\d+\s*$/.test(line)) continue;
    const [pid, parent] = line.trim().split(/\s+/).map(Number) as [number, number];
    if (!Number.isSafeInteger(pid) || pid <= 0 || !Number.isSafeInteger(parent)) continue;
    const siblings = children.get(parent) ?? [];
    siblings.push(pid);
    children.set(parent, siblings);
  }
  const descendants = new Set([root]);
  for (const parent of descendants) {
    for (const pid of children.get(parent) ?? []) descendants.add(pid);
  }
  return [...descendants].reverse();
};
