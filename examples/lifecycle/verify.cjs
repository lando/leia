const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const assertStopped = require('./assert-stopped.cjs');

const root = path.resolve(__dirname, '../..');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verify(entry, format, mode, { signal, secondSignal, retry = 1, timeout = 1 } = {}) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-lifecycle-'));
  const trace = path.join(scratch, 'trace');
  const [executable, cli] = entry;
  const args = [
    cli,
    'lifecycle.scenario',
    '--shell=bash',
    `--module-format=${format}`,
    `--retry=${retry}`,
    `--timeout=${signal ? 0 : timeout}`,
  ];
  if (mode === 'stdin' || mode.startsWith('tty')) args.push('--stdin');
  const command = !mode.startsWith('tty')
    ? [executable, ...args]
    : ['python3', path.join(__dirname, 'terminal.py'), executable, ...args];
  const child = spawn(command[0], command.slice(1), {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LEIA_PROBE_TRACE: trace,
      LEIA_PROBE_MODE: mode,
      LEIA_PROBE_RETRY: String(retry),
    },
  });
  let output = '';
  child.stdout.on('data', (data) => {
    output += data;
  });
  child.stderr.on('data', (data) => {
    output += data;
  });
  child.stdin.on('error', () => {}).end('input\n');
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code));
  });
  const deadline = setTimeout(() => child.kill('SIGKILL'), 15000);
  const selected = mode.startsWith('setup-')
    ? 'setup'
    : mode.startsWith('cleanup-')
      ? 'cleanup'
      : 'test';
  const interrupt = async (stage, nextSignal) => {
    const until = Date.now() + 10000;
    while (!fs.existsSync(`${trace}.${stage}.ready`)) {
      assert.equal(child.exitCode, null, output);
      assert.equal(child.signalCode, null, output);
      assert.ok(Date.now() < until, `Signal readiness timeout: ${output}`);
      await pause(10);
    }
    assert.equal(child.kill(nextSignal), true, `Could not send ${nextSignal}`);
  };
  try {
    if (signal) await interrupt(selected, signal);
    if (secondSignal) await interrupt('cleanup', secondSignal);
    const code = await completion;
    const expectedCode = signal
      ? { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }[signal]
      : /failure|timeout/.test(mode)
        ? 1
        : 0;
    assert.equal(code, expectedCode, `${entry.join(' ')} ${format} ${mode}: ${output}`);
    if (mode === 'tty') assert.match(output, /6 passing/);
    if (mode === 'no-deadline')
      assert.equal(fs.readFileSync(`${trace}.deadline`, 'utf8'), 'completed');
    if (mode.endsWith('failure')) {
      assert.match(output, /CODE: 7/);
      assert.match(output, /STDOUT: lifecycle stdout marker/);
      assert.match(output, /STDERR: lifecycle stderr marker/);
    }
    const expected = ['setup', 'setup-next', 'test', 'next', 'cleanup', 'cleanup-next']
      .flatMap((stage) => {
        if (signal && selected !== 'cleanup' && stage === 'next') return [];
        if (signal && selected === 'setup' && ['setup-next', 'test'].includes(stage)) return [];
        if ((secondSignal || (selected === 'cleanup' && signal)) && stage === 'cleanup-next')
          return [];
        const attempts = stage === selected && /failure|retry|timeout/.test(mode) ? retry + 1 : 1;
        return Array.from({ length: attempts }, (_, attempt) => `${stage}:${attempt}\n`);
      })
      .join('');
    assert.equal(fs.readFileSync(trace, 'utf8'), expected, output);
    assertStopped(trace);
  } finally {
    clearTimeout(deadline);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await completion;
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

(async () => {
  const { executionTarget, targetNames } = await import('../../dev/utils/execution-target.ts');
  const selected = process.env.LEIA_RUNTIME ? [process.env.LEIA_RUNTIME] : targetNames;
  const entries = selected.map((name) => {
    const target = executionTarget(name, root);
    return [target.executable, target.cli];
  });
  for (const entry of entries) {
    for (const format of ['commonjs', 'esm']) {
      for (const mode of [
        'success',
        'failure',
        'retry',
        'timeout',
        'setup-failure',
        'setup-retry',
        'setup-timeout',
        'cleanup-failure',
        'cleanup-retry',
        'cleanup-timeout',
        'stdin',
        'eof',
      ])
        await verify(entry, format, mode);
      await verify(entry, format, 'failure', { retry: 0 });
      await verify(entry, format, 'no-deadline', { timeout: 0 });
      if (process.platform !== 'win32')
        for (const mode of ['tty', 'tty-timeout']) await verify(entry, format, mode);
      if (process.platform !== 'win32')
        for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
          for (const mode of ['signal', 'setup-signal', 'cleanup-signal'])
            await verify(entry, format, mode, { signal });
      if (process.platform !== 'win32')
        await verify(entry, format, 'double-signal', { signal: 'SIGINT', secondSignal: 'SIGTERM' });
    }
  }
  process.stdout.write(
    'Selected execution targets passed lifecycle checks in both harness formats.\n' +
      (process.platform === 'win32'
        ? 'POSIX signals and PTYs are not supported on Windows; those cases were excluded.\n'
        : ''),
  );
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
