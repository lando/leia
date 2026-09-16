import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { checkDistribution, distributionFiles } from './distribution.ts';
import { generateApiDocumentation } from './api-documentation.ts';
import {
  checkDocumentationLinks,
  extractDocumentationExample,
  normalizeDocumentationLineEndings,
} from '../utils/documentation.ts';
import { runCommand } from '../utils/run-command.ts';

const publicModules = [
  'leia',
  'find',
  'parse',
  'generate',
  'run',
  'shell',
  'module-format',
  'compiler',
];

interface Packed {
  filename: string;
  shasum: string;
  files: { path: string; mode: number }[];
}

/** verify the npm payload, not the checkout or a directory symlink with development dependencies. */
export async function checkPackage(
  root: string,
  destination?: string,
  scenarios = false,
): Promise<void> {
  await checkDistribution(root);
  const documentation = [
    'README.md',
    'CLI.md',
    'ADVANCED.md',
    'API.md',
    'GITHUB_ACTIONS.md',
    'CONTRIBUTING.md',
    'PLUGINS.md',
    'skills/scenarios/SKILL.md',
  ];
  assert.equal(
    normalizeDocumentationLineEndings(await readFile(join(root, 'API.md'), 'utf8')),
    normalizeDocumentationLineEndings(await generateApiDocumentation(root)),
    'API.md is stale. Run `bun run docs:api` and commit the result.',
  );
  await checkDocumentationLinks(root, documentation);
  const readExample = async (file: string, id: string): Promise<string> =>
    extractDocumentationExample(await readFile(join(root, file), 'utf8'), id).source;
  const quickstart = await readExample('README.md', 'quickstart-scenario');
  const quickstartCommand = await readExample('README.md', 'quickstart-command');
  const lifecycle = await readExample('ADVANCED.md', 'lifecycle-scenario');
  const readmeAPI = await readExample('README.md', 'readme-api');
  const apiESM = await readExample('API.md', 'api-esm');
  const apiCommonJS = await readExample('API.md', 'api-commonjs');
  const scratch = await mkdtemp(join(tmpdir(), 'leia-package-'));
  try {
    const packDirectory = destination ? resolve(root, destination) : join(scratch, 'pack');
    await mkdir(packDirectory, { recursive: true });
    const [packed] = JSON.parse(
      await runCommand(root, ['npm', 'pack', '--json', '--pack-destination', packDirectory]),
    ) as Packed[];
    assert.ok(packed);
    const tarball = join(packDirectory, packed.filename);
    const expected = [
      ...(await distributionFiles(root)),
      'package.json',
      'README.md',
      'LICENSE',
      'CLI.md',
      'ADVANCED.md',
      'API.md',
      'GITHUB_ACTIONS.md',
      'PLUGINS.md',
      '.codex-plugin/plugin.json',
      'skills/scenarios/SKILL.md',
      'skills/scenarios/agents/openai.yaml',
      'skills/scenarios/assets/lando-logo.png',
    ].sort();
    assert.deepEqual(
      packed.files.map((file) => file.path).sort(),
      expected,
      'The tarball must contain exactly the distribution, user guides, and skill bundle.',
    );
    // windows uses npm command shims; posix executable bits are not represented by its filesystem.
    if (process.platform !== 'win32')
      assert.equal(
        packed.files.find((file) => file.path === 'dist/esm/bin/leia.js')!.mode & 0o111,
        0o111,
      );

    const consumer = join(scratch, 'consumer');
    await cp(join(root, 'examples/package'), consumer, { recursive: true });
    await runCommand(consumer, [
      'npm',
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      tarball,
    ]);
    await Promise.all([
      writeFile(join(consumer, 'quickstart.md'), quickstart),
      writeFile(join(consumer, 'lifecycle.md'), lifecycle),
      writeFile(join(consumer, 'documentation-api.mjs'), apiESM),
      writeFile(join(consumer, 'readme-api.mjs'), readmeAPI),
      writeFile(join(consumer, 'documentation-api.cjs'), apiCommonJS),
    ]);
    await lstat(
      join(consumer, 'node_modules/.bin', process.platform === 'win32' ? 'leia.cmd' : 'leia'),
    );
    const installed = join(consumer, 'node_modules/@lando/leia');
    await checkDocumentationLinks(
      installed,
      documentation.filter((file) => file !== 'CONTRIBUTING.md'),
    );
    assert.equal((await lstat(installed)).isSymbolicLink(), false);
    assert.equal(
      await realpath(installed),
      join(await realpath(consumer), 'node_modules/@lando/leia'),
    );
    for (const absent of ['lib', 'utils', 'dev', 'test', 'bin', 'dist/build-receipt.json'])
      await assert.rejects(lstat(join(installed, absent)), { code: 'ENOENT' });
    for (const absent of ['@types/bun', '@types/lodash', '@types/marked', 'bun-types', 'eslint'])
      await assert.rejects(lstat(join(consumer, 'node_modules', absent)), { code: 'ENOENT' });
    for (const file of expected) {
      assert.deepEqual(
        await readFile(join(installed, file)),
        await readFile(join(root, file)),
        `Installed bytes differ: ${file}`,
      );
    }
    const metadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
    assert.equal(metadata.name, '@lando/leia');
    assert.equal(metadata.type, 'module');
    assert.deepEqual(metadata.engines, { node: '>=24.0.0' });
    assert.deepEqual(metadata.files, [
      '/dist/esm',
      '/dist/cjs',
      '/.codex-plugin/plugin.json',
      '/skills',
      '/CLI.md',
      '/ADVANCED.md',
      '/API.md',
      '/GITHUB_ACTIONS.md',
      '/PLUGINS.md',
    ]);
    const plugin = JSON.parse(await readFile(join(installed, '.codex-plugin/plugin.json'), 'utf8'));
    assert.equal(plugin.name, 'leia');
    assert.equal(plugin.version, metadata.version, 'Plugin and npm versions must agree.');
    assert.equal(plugin.skills, './skills/');
    for (const field of ['logo', 'composerIcon']) {
      assert.equal(plugin.interface[field], './skills/scenarios/assets/lando-logo.png');
      await lstat(join(installed, plugin.interface[field]));
    }
    const skill = await readFile(join(installed, 'skills/scenarios/SKILL.md'), 'utf8');
    const frontmatter = Bun.YAML.parse(skill.split('---')[1]!) as {
      name: string;
      metadata: { openclaw: { emoji: string } };
    };
    assert.equal(frontmatter.name, 'leia-scenarios');
    assert.equal(frontmatter.metadata.openclaw.emoji, '👸');
    const agent = Bun.YAML.parse(
      await readFile(join(installed, 'skills/scenarios/agents/openai.yaml'), 'utf8'),
    ) as {
      interface: { icon_small: string; icon_large: string };
    };
    for (const icon of [agent.interface.icon_small, agent.interface.icon_large]) {
      assert.equal(icon, './assets/lando-logo.png');
      await lstat(join(installed, 'skills/scenarios', icon));
    }
    for (const [document, id] of [
      ['README.md', 'github-actions'],
      ['GITHUB_ACTIONS.md', 'github-actions-matrix'],
    ] as const) {
      const workflow = Bun.YAML.parse(
        extractDocumentationExample(await readFile(join(installed, document), 'utf8'), id).source,
      ) as {
        jobs: { scenarios: { steps: { run?: string }[] } };
      };
      assert.ok(
        workflow.jobs.scenarios.steps.some(
          (step) => step.run === 'npm exec --offline -- leia quickstart.md',
        ),
      );
    }
    assert.deepEqual(metadata.bin, { leia: 'dist/esm/bin/leia.js' });
    assert.equal(metadata.main, './dist/cjs/lib/leia.cjs');
    assert.equal(metadata.module, './dist/esm/lib/leia.js');
    assert.equal(metadata.types, './dist/cjs/index.d.cts');
    const exports = Object.fromEntries(
      publicModules.map((name) => [
        name === 'leia' ? '.' : `./${name}`,
        {
          import: { types: `./dist/esm/lib/${name}.d.ts`, default: `./dist/esm/lib/${name}.js` },
          require: {
            types: name === 'leia' ? './dist/cjs/index.d.cts' : `./dist/cjs/lib/${name}.d.cts`,
            default: `./dist/cjs/lib/${name}.cjs`,
          },
        },
      ]),
    );
    assert.deepEqual(metadata.exports, { ...exports, './package.json': './package.json' });
    for (const format of ['mjs', 'cjs']) {
      await runCommand(consumer, ['node', '--enable-source-maps', `consumer.${format}`]);
    }
    // no ambient bun, node, or repository @types may rescue incomplete public declarations.
    for (const resolution of ['Node16', 'NodeNext']) {
      await writeFile(
        join(consumer, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022'],
            module: resolution,
            moduleResolution: resolution,
            strict: true,
            noEmit: true,
            skipLibCheck: false,
            types: [],
            resolveJsonModule: true,
          },
          files: ['types.mts', 'types.cts'],
        }),
      );
      await runCommand(consumer, [
        'node',
        'node_modules/typescript/bin/tsc',
        '--project',
        'tsconfig.json',
      ]);
    }
    if (scenarios) {
      const cli = join(installed, metadata.bin.leia);
      const documentedCommand = quickstartCommand
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join(' ')
        .trim()
        .split(/\s+/);
      assert.deepEqual(documentedCommand, [
        'npm',
        'exec',
        '--offline',
        '--',
        'leia',
        'quickstart.md',
      ]);
      await runCommand(consumer, documentedCommand);
      await runCommand(consumer, [
        'node',
        cli,
        'package.scenario',
        '--shell',
        process.platform === 'win32' ? 'cmd' : 'sh',
      ]);
      await runCommand(consumer, [
        'node',
        cli,
        'lifecycle.md',
        '--shell',
        process.platform === 'win32' ? 'cmd' : 'sh',
      ]);
      await runCommand(consumer, ['node', 'documentation-api.mjs']);
      await runCommand(consumer, ['node', 'readme-api.mjs']);
      await runCommand(consumer, ['node', 'documentation-api.cjs']);
    }
    assert.equal(
      createHash('sha1')
        .update(await readFile(tarball))
        .digest('hex'),
      packed.shasum,
      'Publish the same tarball that passed consumer verification.',
    );
    process.stdout.write(
      `Verified ${tarball}: ESM, CommonJS, declarations, metadata, contents, and documentation links${scenarios ? ', documentation examples, installed CLI scenarios' : ''}.\n`,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
