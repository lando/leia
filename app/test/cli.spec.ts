import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { debugNamespace, parseCLI } from '../lib/cli.ts';
import { getShell } from '../lib/shell.ts';

const dirname = fileURLToPath(new URL('.', import.meta.url));

describe('CLI compatibility', () => {
  it('retains defaults and no-argument help dispatch inputs', () => {
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
  it('retains all short aliases, repeated values, and equals/attached spellings', () => {
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
  it('retains every long flag including hidden no-ops', () => {
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
  it('retains non-strict patterns, end-of-options, and scalar last-value wins', () => {
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
  it('rejects missing values and invalid numeric or enumerated options', () => {
    for (const name of ['retry', 'timeout']) {
      for (const value of ['-1', '1.5', '1x', 'nope', '9007199254740992'])
        assert.throws(() => parseCLI([`--${name}`, value]), new RegExp(`--${name} must be`));
    }
    assert.throws(() => parseCLI(['--timeout=2147484']), /--timeout must be/);
    assert.throws(() => parseCLI(['--retry']), /expects a value/);
    assert.throws(() => parseCLI(['--module-format=amd']), /Expected --module-format/);
    assert.throws(() => parseCLI(['--shell=fish']), /Expected --shell/);
  });
  it('initializes debug before dispatch without overriding an existing namespace', () => {
    assert.equal(debugNamespace(['--debug'], {}), '*');
    assert.equal(debugNamespace(['--debug=leia:*'], { DEBUG: '' }), 'leia:*');
    assert.equal(debugNamespace(['--debug'], { DEBUG: 'existing' }), undefined);
    assert.equal(debugNamespace([], {}), undefined);
  });
  it('should fail the CLI and run cleanup after a failing test', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-lifecycle-'));
    const trace = path.join(tempDir, 'trace');
    const result = spawnSync(
      'bun',
      [
        path.resolve(dirname, '..', 'bin', 'leia.ts'),
        path.resolve(dirname, 'lifecycle-failure.md'),
        '--retry',
        '0',
        '--shell',
        'bash',
      ],
      {
        cwd: path.resolve(dirname, '../..'),
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
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
