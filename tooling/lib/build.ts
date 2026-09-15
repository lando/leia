import { watch } from 'node:fs';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function build(root: string): Promise<void> {
  const outdir = join(root, 'dist');
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  const result = await Bun.build({
    entrypoints: [
      join(root, 'app/bin/leia.ts'),
      join(root, 'app/lib/app.ts'),
      join(root, 'app/lib/compiler.ts'),
      join(root, 'app/lib/runtime.ts'),
      join(root, 'app/lib/api.ts'),
    ],
    root: join(root, 'app'),
    outdir,
    naming: '[dir]/[name].[ext]',
    target: 'node',
    format: 'esm',
    packages: 'external',
    sourcemap: 'external',
  });
  if (!result.success) throw new AggregateError(result.logs, 'Build failed');
  await writeFile(join(outdir, 'package.json'), '{"type":"module"}\n');
  const cli = join(outdir, 'bin/leia.js');
  // Source runs on Bun; the development JavaScript artifact remains executable with Node.
  const code = await readFile(cli, 'utf8');
  await writeFile(cli, code.replace(/^#![^\n]*\n/, '#!/usr/bin/env node\n'));
  await chmod(cli, 0o755);
  process.stdout.write('Built dist/\n');
}

export async function watchBuild(root: string): Promise<void> {
  await build(root);
  // Serialize rebuilds so rapid edits cannot interleave cleanup and emission.
  let pending = Promise.resolve();
  watch(join(root, 'app'), { recursive: true }, () => {
    pending = pending
      .then(() => build(root))
      .catch((error: unknown) => {
        process.stderr.write(`${String(error)}\n`);
      });
  });
  process.stdout.write('Watching app/\n');
}
