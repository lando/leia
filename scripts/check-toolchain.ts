import { readFileSync } from 'node:fs';

const { packageManager } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as {
  packageManager: string;
};
const expected = packageManager.replace(/^bun@/, '');
if (packageManager !== `bun@${Bun.version}`) {
  throw new Error(
    `Use Bun ${expected}, pinned by package.json#packageManager; found ${Bun.version}.`,
  );
}
