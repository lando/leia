import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadSubject, target } from './subject.ts';

const { debugNamespace, parseCLI } = await loadSubject('lib/cli');
const { getShell } = await loadSubject('lib/shell');

const dirname = fileURLToPath(new URL('.', import.meta.url));
const root = path.resolve(dirname, '..');

const invokeCLI = (args: string[], overrides: Record<string, string | undefined> = {}) => {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete environment[name];
    else environment[name] = value;
  }
  return spawnSync(target.executable, [target.cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: environment,
  });
};

describe('lib/cli', () => {
  it('should retain defaults and no-argument help dispatch inputs', () => {
    assert.deepEqual(parseCLI([]), {
      tests: [],
      ignore: [],
      timeout: 1800,
      retry: 1,
      shell: getShell().binary,
      moduleFormat: 'auto',
      setupHeader: ['Start', 'Setup', 'This is the dawning'],
      testHeader: ['Test', 'Validat', 'Verif'],
      cleanupHeader: ['Clean', 'Tear', 'Burn'],
      stdin: false,
      debug: false,
      help: false,
      version: false,
      spawn: false,
      splitFile: false,
    });
  });
  it('should retain all short aliases, repeated values, and equals/attached spellings', () => {
    const options = parseCLI([
      'a.md',
      '-s',
      'One',
      'Two',
      '-sThree',
      '-t=Check',
      '-c',
      'End',
      '-i=x',
      '-i',
      'y',
      '-r2',
    ]);
    assert.deepEqual(options.tests, ['a.md']);
    assert.deepEqual(options.setupHeader, ['One', 'Two', 'Three']);
    assert.deepEqual(options.testHeader, ['Check']);
    assert.deepEqual(options.cleanupHeader, ['End']);
    assert.deepEqual(options.ignore, ['x', 'y']);
    assert.equal(options.retry, 2);
    assert.equal(parseCLI(['-v']).version, true);
  });
  it('should retain every long flag including hidden no-ops', () => {
    const options = parseCLI([
      'a.md',
      '--setup-header=One,Two',
      '--test-header=Check',
      '--cleanup-header=End',
      '--ignore=x',
      '--retry=0',
      '--timeout=0',
      '--shell=sh',
      '--module-format=esm',
      '--stdin',
      '--debug',
      '--spawn',
      '--split-file',
    ]);
    assert.deepEqual(options.setupHeader, ['One', 'Two']);
    assert.deepEqual(options.testHeader, ['Check']);
    assert.deepEqual(options.cleanupHeader, ['End']);
    assert.deepEqual(options.ignore, ['x']);
    assert.equal(options.retry, 0);
    assert.equal(options.timeout, 0);
    assert.equal(options.shell, 'sh');
    assert.equal(options.moduleFormat, 'esm');
    for (const name of ['stdin', 'debug', 'spawn', 'splitFile'] as const)
      assert.equal(options[name], true);
    assert.equal(parseCLI(['--help']).help, true);
    assert.equal(parseCLI(['--version']).version, true);
    for (const shell of ['bash', 'cmd', 'powershell', 'pwsh', 'sh', 'zsh'])
      assert.equal(parseCLI(['--shell', shell]).shell, shell);
    for (const format of ['auto', 'commonjs', 'esm'])
      assert.equal(parseCLI(['--module-format', format]).moduleFormat, format);
  });
  it('should retain non-strict patterns, end-of-options, and scalar last-value wins', () => {
    assert.deepEqual(parseCLI(['a', '--unknown', '-h', '--', '--stdin']).tests, [
      'a',
      '--unknown',
      '-h',
      '--stdin',
    ]);
    assert.equal(parseCLI(['--retry', '2', '--retry', '3']).retry, 3);
    assert.deepEqual(parseCLI(['a', '--stdin=false']).tests, ['a', 'false']);
    assert.deepEqual(parseCLI(['-s', 'One,Two', '-s', 'Three']).setupHeader, ['One,Two', 'Three']);
  });
  it('should reject missing values and invalid numeric or enumerated options', () => {
    for (const name of ['retry', 'timeout']) {
      for (const value of ['-1', '1.5', '1x', 'nope', '9007199254740992'])
        assert.throws(() => parseCLI([`--${name}`, value]), new RegExp(`--${name} must be`));
    }
    assert.throws(() => parseCLI(['--timeout=2147484']), /--timeout must be/);
    assert.throws(() => parseCLI(['--retry']), /expects a value/);
    assert.throws(() => parseCLI(['--module-format=amd']), /Expected --module-format/);
    assert.throws(() => parseCLI(['--shell=fish']), /Expected --shell/);
  });
  it('should initialize debug before dispatch without overriding an existing namespace', () => {
    assert.equal(debugNamespace(['--debug'], {}), '*');
    assert.equal(debugNamespace(['--debug=leia:*'], { DEBUG: '' }), 'leia:*');
    assert.equal(debugNamespace(['--debug'], { DEBUG: 'existing' }), undefined);
    assert.equal(debugNamespace([], {}), undefined);
  });
  it('should render stable plain help for non-TTY and no-color output', () => {
    for (const environment of [
      { CI: undefined, FORCE_COLOR: undefined, NO_COLOR: undefined },
      { CI: undefined, FORCE_COLOR: undefined, NO_COLOR: '1' },
    ]) {
      const result = invokeCLI(['--help'], environment);
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /^Leia\nRun fenced Markdown examples as Mocha tests\.\n/m);
      assert.match(result.stdout, /^Usage$/m);
      assert.match(result.stdout, /^Options$/m);
      assert.match(result.stdout, /^Examples$/m);
      assert.match(result.stdout, /leia <files\.\.\.> \[options\]/);
      assert.equal(
        result.stdout.split('\n').every((line) => line.length <= 100),
        true,
      );
      assert.equal(result.stdout.includes('\u001b['), false);
      assert.equal(result.stdout.includes('\r'), false);
    }
  });
  it('should render color when explicitly forced through a non-TTY stream', () => {
    const result = invokeCLI(['--help'], {
      CI: undefined,
      FORCE_COLOR: '1',
      NO_COLOR: undefined,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes('\u001b['), true);
    assert.match(result.stdout, /Usage/);
  });
  it('should render actionable validation errors without a stack', () => {
    const result = invokeCLI(['README.md', '--timeout', 'nope'], {
      FORCE_COLOR: '0',
      NO_COLOR: undefined,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^error {2} Could not parse command options:/m);
    assert.match(result.stderr, /--timeout must be an integer/);
    assert.match(result.stderr, /^next {3} Run leia --help/m);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
    assert.equal(result.stderr.includes('\u001b['), false);
  });
  it('should report successful execution and warn about retained no-op flags', () => {
    const result = invokeCLI(
      [
        path.resolve(dirname, 'cli-success.md'),
        '--retry',
        '0',
        '--shell',
        'bash',
        '--spawn',
        '--split-file',
      ],
      { FORCE_COLOR: '0', NO_COLOR: '1' },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /^run {4} 1 generated test file from 1 Markdown source$/m);
    assert.match(result.stdout, /1 passing/);
    assert.match(result.stdout, /^done {3} 1 generated test file; 0 failures$/m);
    assert.match(result.stderr, /^warn {3} --spawn is retained for compatibility/m);
    assert.match(result.stderr, /^warn {3} --split-file is retained for compatibility/m);
    assert.match(result.stderr, /^next {3} Remove the flag/m);
    assert.equal(`${result.stdout}${result.stderr}`.includes('\u001b['), false);
  });
  it('should fail the CLI and run cleanup after a failing test', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-lifecycle-'));
    const trace = path.join(tempDir, 'trace');
    const result = spawnSync(
      target.executable,
      [
        target.cli,
        path.resolve(dirname, 'lifecycle-failure.md'),
        '--retry',
        '0',
        '--shell',
        'bash',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          LEIA_LIFECYCLE_TRACE: trace.split(path.sep).join('/'),
          TERM: 'xterm',
        },
      },
    );

    try {
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1, result.stderr || result.stdout);
      assert.equal(fs.readFileSync(trace, 'utf8'), 'setup\ntest\ncleanup\n');
      assert.match(result.stdout, /^run {4} 1 generated test file from 1 Markdown source$/m);
      assert.match(result.stdout, /^failed {2}1 generated test file; 1 failure$/m);
      assert.match(result.stdout, /CODE: 17/);
      assert.match(result.stdout, /STDOUT:/);
      assert.match(result.stdout, /STDERR:/);
      assert.match(result.stderr, /^next {3} Review the failing test output/m);
      assert.doesNotMatch(`${result.stdout}${result.stderr}`, /\n\s+at .*lib\/app/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
