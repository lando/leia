import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { executionTarget, targetNames, type TargetName } from '../utils/execution-target.ts';

async function run(
  root: string,
  command: string[],
  expectedCode = 0,
  env: NodeJS.ProcessEnv = {},
): Promise<string> {
  const child = Bun.spawn(command, {
    cwd: root,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30000,
  });
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
      const filename = join(outdir, file);
      if (!(await stat(filename)).isFile()) return [];
      return [
        [
          file.split(sep).join('/'),
          createHash('sha256')
            .update(await readFile(filename))
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
      (
        await Promise.all(
          ['esm/lib/app.js', 'cjs/lib/app.cjs'].map(async (file) =>
            (await readFile(join(root, 'dist', file), 'utf8').catch(() => '')).includes(marker),
          ),
        )
      ).every(Boolean),
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

async function checkCLI(root: string, name: TargetName): Promise<void> {
  const target = executionTarget(name, root);
  const entry = [target.executable, target.cli];
  const help = await run(root, [...entry, '--help']);
  assert.ok(help.includes('--module-format'));
  assert.equal(await run(root, entry), help);
  assert.ok(!help.includes('--spawn') && !help.includes('--split-file'));
  const version = await run(root, [...entry, '--version']);
  assert.ok(version.includes('@lando/leia/'));
  assert.equal(await run(root, [...entry, '-v']), version);
  for (const args of [
    ['missing-scenario.md'],
    ['--retry=-1'],
    ['--timeout=2147484'],
    ['--module-format=amd'],
  ])
    await run(root, [...entry, ...args], 1);
}

async function copyFixtures(from: string, to: string): Promise<void> {
  await Promise.all(
    ['.bun-version', 'package.json', 'test', 'examples', 'tooling'].map((file) =>
      cp(join(from, file), join(to, file), { recursive: true }),
    ),
  );
  await symlink(
    join(from, 'node_modules'),
    join(to, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}

/** Prove build-free source and independently relocatable Node artifacts in disposable copies. */
export async function checkBuild(repositoryRoot: string): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'leia-build-'));
  try {
    await copyFixtures(repositoryRoot, root);
    await Promise.all(
      ['bin', 'lib', 'utils'].map((file) =>
        cp(join(repositoryRoot, file), join(root, file), { recursive: true }),
      ),
    );
    await assert.rejects(stat(join(root, 'dist')), { code: 'ENOENT' });
    await run(root, [process.execPath, 'run', 'test:app'], 0, { LEIA_RUNTIME: 'source' });
    await checkCLI(root, 'source');
    await assert.rejects(stat(join(root, 'dist')), { code: 'ENOENT' });

    await run(root, [process.execPath, 'run', 'build']);
    const first = await snapshot(root);
    for (const format of ['esm', 'cjs']) {
      const extension = format === 'esm' ? 'js' : 'cjs';
      for (const module of ['bin/leia', 'lib/api', 'lib/compiler', 'lib/runtime', 'lib/leia'])
        assert.ok(first[`${format}/${module}.${extension}`]);
    }
    assert.ok(
      Object.keys(first).every((file) => /^(esm|cjs)\//.test(file)),
      'Build must emit only the two target scopes',
    );
    await writeFile(join(root, 'dist/stale.js'), 'stale output');
    await run(root, [process.execPath, 'run', 'build']);
    assert.deepEqual(
      await snapshot(root),
      first,
      'Builds must clean stale files and emit identical bytes',
    );
    for (const flag of ['--help', '--version']) {
      const outputs = await Promise.all(
        targetNames.map((name) => {
          const target = executionTarget(name, root);
          return run(root, [target.executable, target.cli, flag]);
        }),
      );
      const stable = outputs.map((output) =>
        flag === '--version' ? output.replace(/ node-v\d+\.\d+\.\d+\s*$/, '') : output,
      );
      assert.ok(stable[0]);
      assert.ok(
        stable.every((output) => output === stable[0]),
        `Targets disagree on ${flag}`,
      );
    }
    await checkWatch(root);
    await run(root, [process.execPath, 'run', 'build']);
    assert.deepEqual(
      await snapshot(root),
      first,
      'Watch verification must restore the original build',
    );
    await Promise.all(
      ['bin', 'lib', 'utils'].map((file) => rm(join(root, file), { recursive: true, force: true })),
    );

    for (const name of ['esm', 'cjs'] as const) {
      const isolated = await mkdtemp(join(tmpdir(), `leia-${name}-`));
      try {
        await copyFixtures(root, isolated);
        await cp(join(root, 'dist', name), join(isolated, 'dist', name), { recursive: true });
        for (const absent of ['bin', 'lib', 'utils', `dist/${name === 'esm' ? 'cjs' : 'esm'}`])
          await assert.rejects(stat(join(isolated, absent)), { code: 'ENOENT' });
        await run(isolated, [process.execPath, 'run', 'test:app'], 0, { LEIA_RUNTIME: name });
        await checkCLI(isolated, name);
        const target = executionTarget(name, isolated);
        await run(isolated, [
          'node',
          '--input-type=commonjs',
          '-e',
          `
          const assert = require('node:assert/strict');
          const Leia = require(${JSON.stringify(join(target.directory, `lib/leia.${target.extension}`))});
          assert.equal(typeof Leia, 'function');
          assert.equal(typeof new Leia().parse, 'function');
          ${name === 'esm' ? "assert.equal(require('./'), Leia);" : ''}
        `,
        ]);
        await writeFile(
          join(isolated, 'runtime-probe.md'),
          '# Runtime probe\n\n## Test\n\n```sh\n# should run without source or sibling artifacts\nnode -e "process.exit(0)"\n```\n',
        );
        for (const format of ['commonjs', 'esm'])
          await run(isolated, [
            'node',
            target.cli,
            'runtime-probe.md',
            `--module-format=${format}`,
            `--shell=${process.platform === 'win32' ? 'cmd' : 'sh'}`,
          ]);
      } finally {
        await rm(isolated, { recursive: true, force: true });
      }
    }
    process.stdout.write(
      'Build-free source, isolated ESM/CJS units and CLI, repeatable builds, and dual-target watch passed.\n',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
