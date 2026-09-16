import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadSubject, target } from './subject.ts';

const { parseCLI } = await loadSubject('lib/cli');
const { getShell } = await loadSubject('lib/shell');

const dirname = fileURLToPath(new URL('.', import.meta.url));
const root = path.resolve(dirname, '..');

const invokeCLI = (args: string[], overrides: Record<string, string | undefined> = {}) => {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(environment))
    if (
      /^LEIA_(CLEANUP_HEADER|SETUP_HEADER|TEST_HEADER|IGNORE|RETRY|TIMEOUT|SHELL|MODULE_FORMAT|STDIN|DEBUG)$/.test(
        name,
      )
    )
      delete environment[name];
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
  it('should resolve Leia environment defaults without changing built-in defaults', () => {
    const options = parseCLI(['README.md'], {
      LEIA_CLEANUP_HEADER: 'Done, End',
      LEIA_SETUP_HEADER: 'Before, Prepare',
      LEIA_TEST_HEADER: 'Check, Verify',
      LEIA_IGNORE: '*.tmp, archive/**',
      LEIA_RETRY: '2',
      LEIA_TIMEOUT: '30',
      LEIA_SHELL: 'sh',
      LEIA_MODULE_FORMAT: 'esm',
      LEIA_STDIN: 'true',
      LEIA_DEBUG: '1',
    });
    assert.deepEqual(options.cleanupHeader, ['Done', 'End']);
    assert.deepEqual(options.setupHeader, ['Before', 'Prepare']);
    assert.deepEqual(options.testHeader, ['Check', 'Verify']);
    assert.deepEqual(options.ignore, ['*.tmp', 'archive/**']);
    assert.equal(options.retry, 2);
    assert.equal(options.timeout, 30);
    assert.equal(options.shell, 'sh');
    assert.equal(options.moduleFormat, 'esm');
    assert.equal(options.stdin, true);
    assert.equal(options.debug, true);
    assert.deepEqual(
      parseCLI([], { LEIA_TIMEOUT: '', LEIA_DEBUG: '', LEIA_SETUP_HEADER: '' }),
      parseCLI([]),
    );
  });
  it('should replace environment lists when either alias is supplied', () => {
    const options = parseCLI(
      [
        'README.md',
        '-c',
        'Cleanup',
        '--setup-header=Start',
        '-s',
        'Prepare',
        '--test-header=Test',
        '-i',
        'one/**',
        '--ignore=two/**',
      ],
      {
        LEIA_CLEANUP_HEADER: 'Env',
        LEIA_SETUP_HEADER: 'Env',
        LEIA_TEST_HEADER: 'Env',
        LEIA_IGNORE: 'env/**',
      },
    );
    assert.deepEqual(options.cleanupHeader, ['Cleanup']);
    assert.deepEqual(options.setupHeader, ['Start', 'Prepare']);
    assert.deepEqual(options.testHeader, ['Test']);
    assert.deepEqual(options.ignore, ['one/**', 'two/**']);
  });
  it('should validate only effective environment values with the flag constraints', () => {
    for (const [flag, environment, valid] of [
      ['retry', 'LEIA_RETRY', '2'],
      ['timeout', 'LEIA_TIMEOUT', '30'],
      ['shell', 'LEIA_SHELL', 'sh'],
      ['module-format', 'LEIA_MODULE_FORMAT', 'esm'],
    ]) {
      assert.throws(() => parseCLI([], { [environment!]: 'invalid' }));
      assert.deepEqual(
        parseCLI([`--${flag}=${valid}`], { [environment!]: 'invalid' }),
        parseCLI([`--${flag}=${valid}`]),
      );
    }
    assert.throws(() => parseCLI([], { LEIA_TIMEOUT: '2147484' }), /--timeout must be/);
    assert.throws(() => parseCLI([], { LEIA_RETRY: '-1' }), /--retry must be/);
  });
  it('should allow boolean flags to override enabled or disabled environment defaults', () => {
    for (const name of ['stdin', 'debug'] as const) {
      const key = `LEIA_${name.toUpperCase()}`;
      for (const value of ['1', 'true']) assert.equal(parseCLI([], { [key]: value })[name], true);
      for (const value of ['0', 'false']) assert.equal(parseCLI([], { [key]: value })[name], false);
      assert.equal(parseCLI([`--${name}`], { [key]: 'false' })[name], true);
      assert.equal(parseCLI([`--no-${name}`], { [key]: 'true' })[name], false);
      assert.equal(parseCLI([`--${name}`, `--no-${name}`])[name], false);
      assert.equal(parseCLI([`--no-${name}`, `--${name}`])[name], true);
      assert.throws(() => parseCLI([], { [key]: 'yes' }), new RegExp(key));
      assert.doesNotThrow(() => parseCLI([`--no-${name}`], { [key]: 'invalid' }));
      assert.throws(() => parseCLI([`--no-${name}=false`]), /does not accept a value/);
    }
  });
  it('should preserve explicit stdin inheritance independently of CI', () => {
    assert.equal(parseCLI([], { CI: '1' }).stdin, false);
    assert.equal(parseCLI(['--stdin'], { CI: '1' }).stdin, true);
    assert.equal(parseCLI([], { CI: '1', LEIA_STDIN: '1' }).stdin, true);
    assert.equal(parseCLI(['--no-stdin'], { CI: '1', LEIA_STDIN: '1' }).stdin, false);
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
  it('should accept debug only as a value-free flag before the option terminator', () => {
    assert.equal(parseCLI(['README.md', '--debug']).debug, true);
    const positional = parseCLI(['--', '--debug']);
    assert.equal(positional.debug, false);
    assert.deepEqual(positional.tests, ['--debug']);
    for (const value of ['leia:*', '*', '', 'true', 'false'])
      assert.throws(() => parseCLI([`--debug=${value}`]), /--debug does not accept a value/);
  });
  it('should honor DEBUG and let the debug flag enable every namespace', () => {
    for (const [args, DEBUG, LEIA_DEBUG] of [
      [['--help'], 'leia:cli', undefined],
      [['--debug', '--help'], 'another:namespace', '0'],
      [['--help'], 'another:namespace', '1'],
      [['--no-debug', '--help'], 'leia:cli', '1'],
      [['--debug', '--help'], undefined, undefined],
    ] as const) {
      const result = invokeCLI([...args], { DEBUG, LEIA_DEBUG, FORCE_COLOR: '0' });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stderr, /leia:cli starting default command execution/);
    }
    const disabled = invokeCLI(['--no-debug', '--help'], { DEBUG: undefined, LEIA_DEBUG: '1' });
    assert.equal(disabled.status, 0, disabled.stderr);
    assert.equal(disabled.stderr, '');
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
      assert.match(result.stdout, /^usage: \[LEIA_\*\.\.\.\] leia <files\.\.\.> \[options\]\n/);
      assert.match(result.stdout, /\nruns fenced markdown examples as mocha tests\n/);
      assert.match(result.stdout, /^options$/m);
      assert.match(result.stdout, /^examples$/m);
      assert.match(result.stdout, /leia <files\.\.\.> \[options\]/);
      const options = result.stdout.split('\noptions\n')[1]!.split('\nexamples\n')[0]!;
      const flags = options.split('\n').filter((line) => line.trimStart().startsWith('-'));
      assert.match(flags.slice(-3).join('\n'), /--version.*\n.*--debug.*\n.*--help/);
      assert.doesNotMatch(options, /--(?:cleanup|setup|test)-header/);
      for (const flag of ['c', 's', 't'])
        assert.match(options, new RegExp(`^  -${flag} <names\\.\\.\\.>.*\\[default: .*\\]$`, 'm'));
      assert.match(result.stdout, /\nexamples\n[\s\S]*\nenvironment variables\n/);
      assert.doesNotMatch(result.stdout, /DEBUG=/);
      assert.doesNotMatch(result.stdout, /^ {2}DEBUG /m);
      assert.match(result.stdout, /LEIA_DEBUG +same as --debug/);
      assert.match(result.stdout, /LEIA_STDIN +same as --stdin/);
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
    assert.match(result.stdout, /usage/);
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
