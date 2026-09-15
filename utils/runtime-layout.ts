import { fileURLToPath } from 'node:url';

/** Resolve from source or bundled bin/lib modules; metadata belongs to the package root. */
export const runtimeLayout = (
  moduleURL: string,
): {
  root: string;
  packageFile: string;
  runtimePath: string;
} => {
  const extension = new URL(moduleURL).pathname.endsWith('.ts')
    ? 'ts'
    : new URL(moduleURL).pathname.endsWith('.cjs')
      ? 'cjs'
      : 'js';
  const source = extension === 'ts';
  const root = new URL(source ? '../' : '../../../', moduleURL);
  return {
    root: fileURLToPath(root),
    packageFile: fileURLToPath(new URL('package.json', root)),
    runtimePath: fileURLToPath(new URL(`../lib/runtime.${extension}`, moduleURL)),
  };
};
