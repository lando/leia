import { watch } from 'node:fs';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

export async function build(root: string): Promise<void> {
  const outdir = join(root, 'dist');
  const sources = [...new Bun.Glob('{lib,utils}/**/*.ts').scanSync(root)].sort();
  await rm(outdir, { recursive: true, force: true });
  for (const format of ['esm', 'cjs'] as const) {
    const destination = join(outdir, format);
    await mkdir(destination, { recursive: true });
    // The pinned CJS bundler mislinks shared exports across multiple entrypoints.
    // Compile each CJS entry independently instead of patching emitted JavaScript.
    for (const entries of format === 'cjs' ? sources.map((file) => [file]) : [sources]) {
      const result = await Bun.build({
        entrypoints: entries.map((file) => join(root, file)),
        root,
        outdir: destination,
        naming: `[dir]/[name].${format === 'cjs' ? 'cjs' : 'js'}`,
        target: 'node',
        format,
        packages: 'external',
        sourcemap: 'linked',
        ...(format === 'cjs'
          ? {
              // Bun otherwise embeds source URLs in CJS. Resolve from the emitted file at runtime.
              define: { 'import.meta.url': '__leiaModuleURL' },
              banner: 'var __leiaModuleURL = require("node:url").pathToFileURL(__filename).href;',
            }
          : {}),
      });
      if (!result.success) throw new AggregateError(result.logs, `${format} build failed`);
      // Bun's sources are relative to outdir, not to a nested map's own directory.
      for (const artifact of result.outputs.filter((output) => output.kind === 'sourcemap')) {
        const map = JSON.parse(await artifact.text()) as { sources: string[] };
        map.sources = map.sources.map((source) =>
          relative(dirname(artifact.path), resolve(destination, source)).split(sep).join('/'),
        );
        await writeFile(artifact.path, JSON.stringify(map) + '\n');
      }
    }
    await writeFile(
      join(destination, 'package.json'),
      JSON.stringify({ type: format === 'esm' ? 'module' : 'commonjs' }) + '\n',
    );
    await mkdir(join(destination, 'bin'), { recursive: true });
    const cli = join(destination, `bin/leia.${format === 'cjs' ? 'cjs' : 'js'}`);
    const launcher =
      format === 'esm'
        ? "import {runCLI} from '../lib/app.js';"
        : "const {runCLI} = require('../lib/app.cjs');";
    await writeFile(cli, `#!/usr/bin/env node\n${launcher}\nvoid runCLI();\n`);
    await chmod(cli, 0o755);
    if (format === 'cjs') {
      // Match Node's ESM module.exports interop contract for direct CommonJS consumers.
      const api = join(destination, 'lib/leia.cjs');
      await writeFile(
        api,
        (await readFile(api, 'utf8')) +
          '\nmodule.exports = Object.assign(module.exports.Leia, module.exports);\n',
      );
    }
  }
  process.stdout.write('Built dist/esm/ and dist/cjs/\n');
}

export async function watchBuild(root: string): Promise<void> {
  await build(root);
  // Serialize rebuilds so rapid edits cannot interleave cleanup and emission.
  let pending = Promise.resolve();
  for (const directory of ['bin', 'lib', 'utils'])
    watch(join(root, directory), { recursive: true }, () => {
      pending = pending
        .then(() => build(root))
        .catch((error: unknown) => {
          process.stderr.write(`${String(error)}\n`);
        });
    });
  process.stdout.write('Watching bin/, lib/, utils/\n');
}
