import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';

interface Receipt {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

async function hashes(root: string, files: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    files.sort().map(async (file) => [
      file,
      createHash('sha256')
        .update(await readFile(join(root, file)))
        .digest('hex'),
    ]),
  );
  return Object.fromEntries(entries);
}

async function inputs(root: string): Promise<Record<string, string>> {
  return hashes(root, [
    'package.json',
    'bun.lock',
    '.bun-version',
    'tsconfig.json',
    'tsconfig.build.json',
    ...new Bun.Glob('{bin,lib,utils,dev}/**/*.ts').scanSync(root),
  ]);
}

export async function distributionFiles(root: string): Promise<string[]> {
  const files = await readdir(join(root, 'dist'), { recursive: true });
  return (
    await Promise.all(
      files.map(async (file) => {
        const normalized = file.split(sep).join('/');
        return normalized !== 'build-receipt.json' &&
          (await stat(join(root, 'dist', file))).isFile()
          ? [`dist/${normalized}`]
          : [];
      }),
    )
  )
    .flat()
    .sort();
}

/** Written last; a failed build cannot leave an apparently publishable distribution. */
export async function recordDistribution(root: string): Promise<void> {
  const receipt: Receipt = {
    inputs: await inputs(root),
    outputs: await hashes(root, await distributionFiles(root)),
  };
  await writeFile(join(root, 'dist/build-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
}

/** Packing never silently repairs stale output. Build explicitly, then pack exactly those bytes. */
export async function checkDistribution(root: string): Promise<void> {
  const receipt = JSON.parse(
    await readFile(join(root, 'dist/build-receipt.json'), 'utf8'),
  ) as Receipt;
  assert.deepEqual(
    await inputs(root),
    receipt.inputs,
    'Build inputs changed; run bun run build before packing.',
  );
  assert.deepEqual(
    await hashes(root, await distributionFiles(root)),
    receipt.outputs,
    'Distribution is missing, modified, or contains stale files; run bun run build.',
  );
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
    exports: Record<string, unknown>;
    main: string;
    module: string;
    types: string;
    bin: Record<string, string>;
  };
  const targets = (value: unknown): string[] =>
    typeof value === 'string'
      ? [value]
      : Object.values(value as Record<string, unknown>).flatMap(targets);
  for (const target of targets([
    manifest.exports,
    manifest.main,
    manifest.module,
    manifest.types,
    manifest.bin,
  ])) {
    if (target === './package.json') continue;
    assert.ok(
      receipt.outputs[target.replace(/^\.\//, '')],
      `Missing declared package target: ${target}`,
    );
  }
}
