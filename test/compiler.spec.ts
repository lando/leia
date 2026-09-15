import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Harness, ModuleFormat } from '../lib/compiler.ts';
import { loadSubject, subjectPath } from './subject.ts';

const { compileHarness, find, generate, normalizeCommand, parse, readMarkdown } =
  await loadSubject('lib/compiler');

const fixtures = fileURLToPath(new URL('./', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = (name: string): string => fs.readFileSync(path.join(fixtures, name), 'utf8');
const input = (): Harness => JSON.parse(fixture('harness-input.json')) as Harness;
const globPath = (file: string): string => file.split(path.sep).join('/');

const normalizePaths = (value: unknown, field = ''): unknown => {
  if (Array.isArray(value)) return value.map((item) => normalizePaths(item, field));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizePaths(item, key)]),
    );
  if (typeof value !== 'string') return value;
  const normalized = (
    field === 'runtimePath'
      ? value.replace(subjectPath('lib/runtime').split(path.sep).join('/'), '<root>/lib/runtime.ts')
      : value
  )
    .replaceAll(path.resolve(root), '<root>')
    .replaceAll(path.resolve(root).split(path.sep).join('/'), '<root>')
    .replaceAll(os.tmpdir(), '<tmp>')
    .replaceAll(os.tmpdir().split(path.sep).join('/'), '<tmp>')
    .replaceAll('\r\n', '\n');
  return field === 'destination' ? normalized.split(path.sep).join('/') : normalized;
};

describe('lib/compiler', () => {
  let temp: string;
  beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-compiler-'));
  });
  afterEach(() => fs.rmSync(temp, { recursive: true, force: true }));
  const markdown = (source: string, name = 'scenario.md'): string => {
    const file = path.join(temp, name);
    fs.writeFileSync(file, source);
    return file;
  };

  it('should match the locked parser IR without changing legacy assertions', () => {
    const files = [
      'examples/basic-example.md',
      'examples/setup-cleanup-example.md',
      'test/parse-sections.md',
      'test/parse-code-blocks.md',
    ];
    assert.deepEqual(
      normalizePaths(parse(files, { shell: 'bash', moduleFormat: 'commonjs' })),
      JSON.parse(fixture('parse-baseline.json')),
    );
  });

  for (const moduleFormat of ['commonjs', 'esm'] as const) {
    it(`should match the typed ${moduleFormat} runtime harness byte-for-byte`, () => {
      const harness = { ...input(), moduleFormat };
      assert.equal(
        compileHarness(harness).source,
        (JSON.parse(fixture(`${moduleFormat}-baseline.json`)) as string[]).join('\n'),
      );
    });
  }

  it('should discover real paths once, preserve pattern order, and exclude directories and ignored files', () => {
    const first = markdown('# First', 'first file.md');
    const second = markdown('# Second', 'second.md');
    fs.mkdirSync(path.join(temp, 'directory.md'));
    assert.deepEqual(
      find([second, path.join(temp, '*.md'), first].map(globPath), ['**/first file.md']),
      [fs.realpathSync(second)],
    );
    assert.deepEqual(find([second, first, second].map(globPath)), [
      fs.realpathSync(second),
      fs.realpathSync(first),
    ]);
    assert.deepEqual(find([]), []);
    assert.deepEqual(find([globPath(path.join(temp, 'missing*.md'))]), []);
  });

  it('should deduplicate symlink aliases by real path', function () {
    // File symlinks on Windows require privileges; directory junctions do not.
    const directory = path.join(temp, 'original');
    const alias = path.join(temp, 'alias');
    fs.mkdirSync(directory);
    const file = path.join(directory, 'test.md');
    fs.writeFileSync(file, '# Test');
    fs.symlinkSync(directory, alias, process.platform === 'win32' ? 'junction' : 'dir');
    assert.deepEqual(find([file, path.join(alias, 'test.md')].map(globPath)), [
      fs.realpathSync(file),
    ]);
  });

  it('should return no harnesses for absent matches, empty files, or documents without test sections', () => {
    assert.deepEqual(parse([], { moduleFormat: 'commonjs' }), []);
    assert.deepEqual(parse([markdown('')]), []);
    assert.deepEqual(
      parse([markdown('# Title\n\n## Other\n\n```sh\n# example\necho ignored\n```')]),
      [],
    );
    assert.deepEqual(generate([]), []);
    assert.throws(() => parse([path.join(temp, 'missing.md')]), /ENOENT/);
  });

  it('should retain only top-level code and first- or second-level headings', () => {
    const file = markdown(
      '# Title\n\nprose\n\n> ## Test quoted\n\n## Test real\n\n### Detail\n\n```sh\n# one\necho one\n```',
    );
    assert.deepEqual(
      readMarkdown([file])[0]?.elements.map((element) => element.type),
      ['heading', 'heading', 'code'],
    );
    assert.equal(parse([file], { shell: 'sh' })[0]?.tests.test?.[0]?.command, 'echo one');
  });

  it('should report missing titles and descriptions while preserving permissive Markdown lexing', () => {
    assert.throws(
      () => parse([markdown('## Test\n\n```sh\n# one\necho one\n```')]),
      /level-one title/,
    );
    const tests = parse([markdown('# Title\n\n## Test\n\n```sh\necho one\n```')], { shell: 'sh' });
    assert.throws(() => compileHarness(tests[0]), /tests.test\[0\].describe/);
    // The pinned lexer treats this unclosed fence as prose, leaving an empty test section.
    assert.deepEqual(
      parse([markdown('# Title\n\n## Test\n\n```sh\n# one\necho one')], { shell: 'sh' })[0]?.tests
        .test,
      [],
    );
  });

  it('should keep the first title, repeated-section numbering, custom prefix priority, and ignored buckets', () => {
    const file = markdown(
      '# First\n\n## Both one\n\n```\n# setup\necho setup\n```\n\n# Second\n\n## Test one\n\n```\n# first\nskip\n```\n\n## Other\n\n```\n# ignored\necho ignored\n```\n\n## Test two\n\n```\n# second\necho two\n```',
    );
    const harness = parse([file], {
      setupHeader: ['Both'],
      testHeader: ['Both', 'Test'],
      shell: 'sh',
    })[0]!;
    assert.equal(harness.text, 'First');
    assert.equal(harness.tests.setup?.length, 1);
    assert.deepEqual(
      harness.tests.test?.map((test) => [test.number, test.skip]),
      [
        [1, true],
        [2, false],
      ],
    );
    assert.equal(harness.tests.invalid?.length, 1);
    const output = compileHarness(harness);
    assert.equal(output.scenarios.length, 3);
    assert.ok(!output.source.includes('echo ignored'));
  });

  it('should normalize CRLF, continuation lines, descriptions, and PowerShell exactly once', () => {
    const source =
      '# Title\r\n\r\n## Test\r\n\r\n```sh\r\n# a description\r\n  echo first \\\r\n  second\r\n  echo last\r\n```';
    const file = markdown(source);
    const command = parse([file], { shell: 'bash' })[0]?.tests.test?.[0]?.command;
    assert.equal(command, ['echo first  second', 'echo last'].join(os.EOL));
    assert.equal(
      normalizeCommand('# label\nWrite-Output "$HOME"', 'pwsh'),
      ['$ErrorActionPreference = "Stop"', 'Write-Output "$HOME"'].join(os.EOL),
    );
    assert.equal(normalizeCommand('skip', 'sh'), 'skip');
    assert.equal(normalizeCommand('', 'sh'), '');
  });

  it('should preserve command bytes, Unicode separators, script modes, and literal metadata in both formats', () => {
    const special = 'quotes \'" \\ ` ${HOME} $(echo nope) \\033 \\1\r\n\t\u2028\u2029';
    for (const moduleFormat of ['commonjs', 'esm'] as const) {
      const harness = input();
      harness.moduleFormat = moduleFormat;
      harness.id = special;
      harness.destination = path.join(temp, `test.leia.${moduleFormat === 'esm' ? 'mjs' : 'cjs'}`);
      harness.tests = {
        test: [
          {
            ...harness.tests.test![0]!,
            command: special,
            script: path.join(temp, `test-${moduleFormat}.sh`),
            describe: [special],
          },
        ],
      };
      assert.deepEqual(generate([harness]), [harness.destination]);
      const scenario = harness.tests.test![0]!;
      assert.equal(fs.readFileSync(scenario.script, 'utf8'), special);
      if (process.platform !== 'win32')
        assert.equal(fs.statSync(scenario.script).mode & 0o777, 0o755);
      const source = fs.readFileSync(harness.destination, 'utf8');
      assert.ok(
        source.includes(
          JSON.stringify(special)
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029'),
        ),
      );
      assert.ok(!source.includes('\u2028'));
      assert.ok(!source.includes('\u2029'));
    }
  });

  it('should validate every harness before writing any output', () => {
    const first = input();
    first.destination = path.join(temp, 'not-created', 'test.cjs');
    const malformed = { ...input(), stdin: 'invalid' };
    assert.throws(() => generate([first, malformed]), /stdin.*inherit.*pipe/);
    assert.ok(!fs.existsSync(path.dirname(first.destination)));
    for (const tests of [null, [], { test: null }, { test: [null] }]) {
      assert.throws(() => compileHarness({ ...input(), tests }), /metadata/);
    }
    for (const [field, value] of Object.entries({
      args: 'source()',
      command: 7,
      describe: [],
      skip: 'yes',
      script: null,
      number: -1,
      shell: null,
    })) {
      const harness = input();
      Object.assign(harness.tests.test![0]!, { [field]: value });
      assert.throws(() => compileHarness(harness), new RegExp(field));
    }
  });

  it('should resolve concrete formats and validate retry even with no inputs', () => {
    assert.throws(() => parse([], { retry: -1 }), /--retry/);
    assert.throws(
      () => parse([], { moduleFormat: 'invalid' as ModuleFormat }),
      /Unsupported module format/,
    );
    const file = markdown('# Title\n\n## Test');
    for (const moduleFormat of ['commonjs', 'esm'] as const) {
      const harness = parse([file], { moduleFormat, retry: '0', stdin: true })[0]!;
      assert.equal(harness.moduleFormat, moduleFormat);
      assert.ok(harness.destination.endsWith(moduleFormat === 'esm' ? '.leia.mjs' : '.leia.cjs'));
      assert.equal(harness.retry, 0);
      assert.equal(harness.stdin, 'inherit');
      assert.deepEqual(harness.tests.test, []);
    }
  });
});
