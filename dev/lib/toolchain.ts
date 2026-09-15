import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import validateToolchain from '../utils/validate-toolchain.ts';

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

export async function checkToolchain(root: string): Promise<void> {
  const expected = (await readFile(join(root, '.bun-version'), 'utf8')).trim();
  const manifest: unknown = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const packageManager =
    typeof manifest === 'object' && manifest !== null && 'packageManager' in manifest
      ? manifest.packageManager
      : undefined;
  validateToolchain(expected, packageManager, Bun.version);
}
