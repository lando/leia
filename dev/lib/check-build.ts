import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import { executionTarget, targetNames, type TargetName } from '../utils/execution-target.ts';

import { checkDistribution } from './distribution.ts';
import { runCommand as run } from '../utils/run-command.ts';

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
  const sourcePath = join(root, 'lib/run-cli.ts');
  const original = await readFile(sourcePath, 'utf8');
  const marker = 'leiaWatchRebuildProbe';
  const watcher = Bun.spawn([process.execPath, 'run', 'dev/scripts/build-cli.ts', '--watch'], {
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
          [
            'esm/lib/run-cli.js',
            'cjs/lib/run-cli.cjs',
            'esm/lib/run-cli.d.ts',
            'cjs/lib/run-cli.d.cts',
          ].map(async (file) =>
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

async function checkSourceMaps(root: string, files: string[]): Promise<void> {
  for (const file of files.filter((file) => file.endsWith('.map'))) {
    const filename = join(root, 'dist', file);
    const map = JSON.parse(await readFile(filename, 'utf8')) as {
      sources: string[];
      sourcesContent: string[];
    };
    assert.ok(
      (await readFile(filename.slice(0, -4), 'utf8')).includes(
        `//# sourceMappingURL=${basename(filename)}`,
      ),
    );
    for (const [index, source] of map.sources.entries()) {
      const sourceFile = resolve(dirname(filename), source);
      assert.match(relative(root, sourceFile).split(sep).join('/'), /^(lib|utils)\/.+\.ts$/);
      assert.equal(
        map.sourcesContent[index],
        await readFile(sourceFile, 'utf8'),
        'Source map content must match TypeScript',
      );
    }
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
    ['.bun-version', 'package.json', 'bun.lock', 'tsconfig.json', 'tsconfig.build.json', 'dev'].map(
      (file) => cp(join(from, file), join(to, file), { recursive: true }),
    ),
  );
  await symlink(
    join(from, 'node_modules'),
    join(to, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}

/** Prove build-free source and independently relocatable Node artifacts in disposable copies. */
export async function checkBuild(repositoryRoot: string, scenarios = false): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'leia-build-'));
  try {
    await copyFixtures(repositoryRoot, root);
    await Promise.all(
      ['bin', 'lib', 'utils'].map((file) =>
        cp(join(repositoryRoot, file), join(root, file), { recursive: true }),
      ),
    );
    await assert.rejects(stat(join(root, 'dist')), { code: 'ENOENT' });
    if (scenarios) await checkCLI(root, 'source');
    await assert.rejects(stat(join(root, 'dist')), { code: 'ENOENT' });

    await run(root, [process.execPath, 'run', 'build']);
    const first = await snapshot(root);
    await checkSourceMaps(root, Object.keys(first));
    await checkDistribution(root);
    for (const file of ['dist/esm/lib/parse.js', 'dist/cjs/lib/parse.d.cts']) {
      const original = await readFile(join(root, file));
      await rm(join(root, file));
      await assert.rejects(checkDistribution(root));
      await writeFile(join(root, file), original);
    }
    const source = await readFile(join(root, 'lib/find.ts'), 'utf8');
    await writeFile(join(root, 'lib/find.ts'), source + '\n// changed input\n');
    await assert.rejects(checkDistribution(root));
    await writeFile(join(root, 'lib/find.ts'), source);
    const declaration = join(root, 'dist/esm/lib/parse.d.ts');
    const originalDeclaration = await readFile(declaration, 'utf8');
    await writeFile(declaration, originalDeclaration + '\n// modified artifact\n');
    await assert.rejects(checkDistribution(root));
    await writeFile(declaration, originalDeclaration);
    await checkDistribution(root);
    await writeFile(
      join(root, 'lib/find.ts'),
      source + '\nexport const brokenDeclaration: string = 42;\n',
    );
    await run(root, [process.execPath, 'run', 'build'], 1);
    await assert.rejects(stat(join(root, 'dist/build-receipt.json')), { code: 'ENOENT' });
    await writeFile(join(root, 'lib/find.ts'), source);
    await run(root, [process.execPath, 'run', 'build']);
    assert.deepEqual(
      await snapshot(root),
      first,
      'A repaired build must restore the exact artifact',
    );
    const throwLine =
      (await readFile(join(root, 'utils/parse-non-negative-integer.ts'), 'utf8'))
        .split('\n')
        .findIndex((line) => line.includes('throw new Error')) + 1;
    assert.ok(throwLine > 0);
    for (const format of ['esm', 'cjs']) {
      const extension = format === 'esm' ? 'js' : 'cjs';
      for (const module of ['bin/leia', 'lib/compiler', 'lib/runtime', 'lib/leia'])
        assert.ok(first[`${format}/${module}.${extension}`]);
    }
    assert.ok(
      Object.keys(first).every(
        (file) => file === 'build-receipt.json' || /^(esm|cjs)\//.test(file),
      ),
      'Build must emit only the two target scopes',
    );
    await writeFile(join(root, 'dist/stale.js'), 'stale output');
    await assert.rejects(checkDistribution(root));
    await run(root, ['npm', 'pack', '--dry-run', '--json'], 1);
    await run(root, [process.execPath, 'run', 'build']);
    assert.deepEqual(
      await snapshot(root),
      first,
      'Builds must clean stale files and emit identical bytes',
    );
    for (const flag of scenarios ? ['--help', '--version'] : []) {
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
        if (scenarios) await checkCLI(isolated, name);
        const target = executionTarget(name, isolated);
        await run(isolated, [
          'node',
          '--enable-source-maps',
          '--input-type=commonjs',
          '-e',
          `const assert = require('node:assert/strict');
          const {parseNonNegativeInteger} = require(${JSON.stringify(join(target.directory, `utils/parse-non-negative-integer.${target.extension}`))});
          assert.throws(() => parseNonNegativeInteger(-1, '--probe', 10), error => {
            assert.ok(error.stack.includes(${JSON.stringify(join(isolated, 'utils/parse-non-negative-integer.ts'))} + ':${throwLine}:'), error.stack);
            return true;
          });`,
        ]);
        await run(isolated, [
          'node',
          '--input-type=commonjs',
          '-e',
          `
          const assert = require('node:assert/strict');
          const Leia = require(${JSON.stringify(join(target.directory, `lib/leia.${target.extension}`))});
          assert.equal(typeof Leia, 'function');
          assert.equal(typeof new Leia().parse, 'function');
          ${name === 'cjs' ? "assert.equal(require('./'), Leia);" : ''}
        `,
        ]);
        await writeFile(
          join(isolated, 'runtime-probe.md'),
          '# Runtime probe\n\n## Test\n\n```sh\n# should run without source or sibling artifacts\nnode -e "process.exit(0)"\n```\n',
        );
        for (const format of scenarios ? ['commonjs', 'esm'] : [])
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
      `Repeatable ESM/CJS builds, declarations, freshness gates, and watch passed${scenarios ? ' with CLI scenarios' : ''}.\n`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
