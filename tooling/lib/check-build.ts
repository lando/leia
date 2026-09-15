import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';

async function run(root: string, command: string[], expectedCode = 0): Promise<string> {
  const child = Bun.spawn(command, { cwd: root, stdout: 'pipe', stderr: 'pipe', timeout: 20000 });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  assert.equal(code, expectedCode, `${command.join(' ')}\n${stderr}\n${stdout}`);
  return stdout;
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const outdir = join(root, 'dist');
  const entries = await Promise.all(
    (await readdir(outdir, { recursive: true })).map(async (file) => {
      const path = join(outdir, file);
      if (!(await stat(path)).isFile()) return [];
      return [
        [
          file.split(sep).join('/'),
          createHash('sha256')
            .update(await readFile(path))
            .digest('hex'),
        ],
      ];
    }),
  );
  return Object.fromEntries(
    entries.flat().sort(([left = ''], [right = '']) => left.localeCompare(right)),
  );
}

async function checkWatch(root: string): Promise<void> {
  const sourcePath = join(root, 'lib/app.ts');
  const original = await readFile(sourcePath, 'utf8');
  const marker = 'leiaWatchRebuildProbe';
  const watcher = Bun.spawn([process.execPath, 'run', 'tooling/scripts/build-cli.ts', '--watch'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30000,
  });
  let watchOutput = '';
  const output = (async (): Promise<void> => {
    for await (const chunk of watcher.stdout) watchOutput += new TextDecoder().decode(chunk);
  })();
  const errors = new Response(watcher.stderr).text();
  const waitFor = async (predicate: () => Promise<boolean>): Promise<void> => {
    const deadline = Date.now() + 20000;
    while (!(await predicate())) {
      assert.equal(watcher.exitCode, null, `Watch process exited early: ${watchOutput}`);
      assert.ok(Date.now() < deadline, `Watch startup/rebuild timed out: ${watchOutput}`);
      await Bun.sleep(50);
    }
  };
  try {
    await waitFor(() => Promise.resolve(watchOutput.includes('Watching bin/, lib/, utils/')));
    await writeFile(sourcePath, `${original}\nexport const ${marker} = true;\n`);
    await waitFor(async () =>
      (await readFile(join(root, 'dist/lib/app.js'), 'utf8').catch(() => '')).includes(marker),
    );
  } finally {
    watcher.kill();
    await watcher.exited;
    await writeFile(sourcePath, original);
    await output;
    const stderr = await errors;
    if (stderr) process.stderr.write(stderr);
  }
}

/** Exercise the actual source and build commands without editing the contributor's checkout. */
export async function checkBuild(repositoryRoot: string): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'leia-build-'));
  try {
    await Promise.all(
      ['.bun-version', 'package.json', 'bin', 'lib', 'utils', 'tooling'].map((path) =>
        cp(join(repositoryRoot, path), join(root, path), { recursive: true }),
      ),
    );
    // A Windows junction avoids requiring symlink privileges on contributor machines.
    await symlink(
      join(repositoryRoot, 'node_modules'),
      join(root, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    await run(root, [process.execPath, 'run', 'build']);
    const first = await snapshot(root);
    assert.deepEqual(Object.keys(first), [
      'bin/leia.js',
      'bin/leia.js.map',
      'lib/api.js',
      'lib/api.js.map',
      'lib/app.js',
      'lib/app.js.map',
      'lib/compiler.js',
      'lib/compiler.js.map',
      'lib/leia.js',
      'lib/leia.js.map',
      'lib/runtime.js',
      'lib/runtime.js.map',
      'package.json',
    ]);
    await writeFile(join(root, 'dist/stale.js'), 'stale output');
    await run(root, [process.execPath, 'run', 'build']);
    assert.deepEqual(
      await snapshot(root),
      first,
      'Builds must clean stale files and emit identical bytes',
    );

    for (const flag of ['--help', '--version']) {
      const source = await run(root, [process.execPath, 'run', 'bin/leia.ts', flag]);
      const built = await run(root, ['node', 'dist/bin/leia.js', flag]);
      // Version output includes the runtime's Node-compatibility version.
      const stableOutput = (value: string): string =>
        flag === '--version' ? value.replace(/ node-v\d+\.\d+\.\d+\s*$/, '') : value;
      assert.equal(
        stableOutput(source),
        stableOutput(built),
        `Source and Node-built CLI disagree on ${flag}`,
      );
      assert.ok(source.includes(flag === '--help' ? '--module-format' : '@lando/leia'));
    }
    for (const entry of [
      [process.execPath, 'run', 'bin/leia.ts'],
      ['node', 'dist/bin/leia.js'],
    ]) {
      const help = await run(root, [...entry, '--help']);
      assert.equal(await run(root, entry), help);
      assert.ok(!help.includes('--spawn') && !help.includes('--split-file'));
      assert.equal(await run(root, [...entry, '-v']), await run(root, [...entry, '--version']));
      for (const args of [
        ['missing-scenario.md'],
        ['--retry=-1'],
        ['--timeout=2147484'],
        ['--module-format=amd'],
      ])
        await run(root, [...entry, ...args], 1);
    }
    await run(root, [
      'node',
      '--input-type=module',
      '-e',
      "import {runCLI} from './dist/lib/app.js'; if (typeof runCLI !== 'function') process.exit(1)",
    ]);

    await checkWatch(root);
    await run(root, [process.execPath, 'run', 'build']);
    assert.deepEqual(
      await snapshot(root),
      first,
      'Watch verification must restore the original build',
    );
    // Prove the package entrypoint and emitted compiler do not depend on TypeScript sources.
    await Promise.all(
      ['bin', 'lib', 'utils'].map((directory) =>
        rm(join(root, directory), { recursive: true, force: true }),
      ),
    );
    await writeFile(
      join(root, 'compiler-probe.md'),
      '# Compiler probe\n\n## Test\n\n```sh\n# preserves bytes\nprintf "%s\\n" "$HOME"\n```\n',
    );
    await run(root, [
      'node',
      '--input-type=commonjs',
      '-e',
      `
      const assert = require('node:assert/strict');
      const Leia = require('./');
      const {compileHarness} = require('./dist/lib/compiler.js');
      const leia = new Leia();
      const files = leia.find(['compiler-probe.md']);
      assert.equal(files.length, 1);
      for (const moduleFormat of ['commonjs', 'esm']) {
        const [harness] = leia.parse(files, {moduleFormat, shell: 'sh'});
        assert.equal(harness.tests.test[0].describe[0], 'preserves bytes');
        const output = compileHarness(harness);
        assert.ok(output.source.includes(JSON.stringify(harness.tests.test[0].command)));
        assert.ok(output.destination.endsWith(moduleFormat === 'esm' ? '.leia.mjs' : '.leia.cjs'));
      }
    `,
    ]);
    await writeFile(
      join(root, 'runtime-probe.md'),
      '# Runtime probe\n\n## Test\n\n```sh\n# should run without TypeScript sources\nnode -e "process.exit(0)"\n```\n',
    );
    for (const format of ['commonjs', 'esm']) {
      await run(root, [
        'node',
        'dist/bin/leia.js',
        'runtime-probe.md',
        `--module-format=${format}`,
        `--shell=${process.platform === 'win32' ? 'cmd' : 'sh'}`,
      ]);
    }
    process.stdout.write(
      'Isolated repeatable build, source/Node CLI parity, watch rebuild, and source-free compiler/runtime passed.\n',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
