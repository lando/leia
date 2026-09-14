import { mkdir, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import './check-toolchain.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const outdir = `${root}dist`;

const build = async (): Promise<void> => {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  const result = await Bun.build({
    entrypoints: [`${root}src/cli.ts`, `${root}src/index.ts`],
    outdir,
    target: 'node',
    format: 'esm',
    packages: 'external',
    sourcemap: 'external',
  });
  if (!result.success) throw new AggregateError(result.logs, 'Build failed');
  await writeFile(`${outdir}/package.json`, '{"type":"module"}\n');
  process.stdout.write('Built dist/\n');
};

await build();
if (process.argv.includes('--watch')) {
  // Serialize rebuilds so rapid edits cannot interleave output cleanup and emission.
  let pending = Promise.resolve();
  watch(`${root}src`, { recursive: true }, () => {
    pending = pending.then(build).catch((error: unknown) => {
      process.stderr.write(`${String(error)}\n`);
    });
  });
  process.stdout.write('Watching src/\n');
}
