import path from 'node:path';

export const targetNames = ['source', 'esm', 'cjs'] as const;
export type TargetName = (typeof targetNames)[number];

/** Resolve an explicit test target; unknown names must never silently fall back to source. */
export const executionTarget = (name: string, root: string) => {
  if (!targetNames.includes(name as TargetName))
    throw new Error(`Unknown Leia execution target: ${name}`);
  const source = name === 'source';
  const extension = source ? 'ts' : name === 'cjs' ? 'cjs' : 'js';
  const directory = source ? root : path.join(root, 'dist', name);
  return {
    name: name as TargetName,
    executable: source ? 'bun' : 'node',
    directory,
    extension,
    cli: path.join(directory, 'bin', `leia.${extension}`),
  };
};
