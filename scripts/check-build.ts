import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import './check-toolchain.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const run = async (cmd: string[]): Promise<string> => {
  const child = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe', timeout: 20000 });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  assert.equal(code, 0, `${cmd.join(' ')}\n${stderr}\n${stdout}`);
  return stdout;
};

const snapshot = async (): Promise<Record<string, string>> => {
  const files = (await readdir('dist')).sort();
  return Object.fromEntries(
    await Promise.all(
      files.map(
        async (file) =>
          [
            file,
            createHash('sha256')
              .update(await readFile(`dist/${file}`))
              .digest('hex'),
          ] as const,
      ),
    ),
  );
};

await run([process.execPath, 'run', 'build']);
const first = await snapshot();
assert.deepEqual(Object.keys(first), [
  'cli.js',
  'cli.js.map',
  'index.js',
  'index.js.map',
  'package.json',
]);
await writeFile('dist/stale.js', 'stale output');
await run([process.execPath, 'run', 'build']);
assert.deepEqual(
  await snapshot(),
  first,
  'Builds must remove stale files and emit identical bytes',
);

for (const flag of ['--help', '--version']) {
  const source = await run([process.execPath, 'run', 'src/cli.ts', flag]);
  const built = await run(['node', 'dist/cli.js', flag]);
  const legacy = await run(['node', 'bin/leia', flag]);
  // oclif includes the host's Node version (Bun reports its compatibility version).
  const stableOutput = (value: string): string =>
    flag === '--version' ? value.replace(/ node-v\d+\.\d+\.\d+\s*$/, '') : value;
  assert.equal(
    stableOutput(source),
    stableOutput(built),
    `Source and Node-built CLI disagree on ${flag}`,
  );
  assert.equal(built, legacy, `Built and legacy Node CLI disagree on ${flag}`);
  assert.ok(source.includes(flag === '--help' ? '--module-format' : '@lando/leia'));
}
await run([
  'node',
  '--input-type=module',
  '-e',
  `import {runCLI} from './dist/index.js'; if (typeof runCLI !== 'function') process.exit(1)`,
]);

const sourcePath = 'src/index.ts';
const original = await readFile(sourcePath, 'utf8');
const marker = 'leiaWatchRebuildProbe';
const watcher = Bun.spawn([process.execPath, 'run', 'scripts/build.ts', '--watch'], {
  stdout: 'pipe',
  stderr: 'pipe',
});
let watchOutput = '';
const output = (async (): Promise<void> => {
  for await (const chunk of watcher.stdout) watchOutput += new TextDecoder().decode(chunk);
})();
const errors = new Response(watcher.stderr).text();

const waitFor = async (predicate: () => Promise<boolean>): Promise<void> => {
  const deadline = Date.now() + 20000;
  while (!(await predicate())) {
    assert.equal(watcher.exitCode, null, 'Watch process exited early');
    assert.ok(Date.now() < deadline, `Watch startup/rebuild timed out: ${watchOutput}`);
    await Bun.sleep(50);
  }
};

try {
  await waitFor(() => Promise.resolve(watchOutput.includes('Watching src/')));
  await writeFile(sourcePath, `${original}\nexport const ${marker} = true;\n`);
  await waitFor(async () =>
    (await readFile('dist/index.js', 'utf8').catch(() => '')).includes(marker),
  );
} finally {
  watcher.kill();
  await watcher.exited;
  await writeFile(sourcePath, original);
  await Promise.all([output, errors]);
  await run([process.execPath, 'run', 'build']);
}
assert.deepEqual(await snapshot(), first, 'Watch verification must restore the original build');
process.stdout.write('Repeatable build, source/Node CLI parity, and watch rebuild passed.\n');
