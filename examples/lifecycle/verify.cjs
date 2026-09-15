const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const entries = [
  ['bun', path.join(root, 'bin/leia.ts')],
  ['node', path.join(root, 'dist/bin/leia.js')],
];

async function verify(entry, format, mode, signal) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-lifecycle-'));
  const trace = path.join(scratch, 'trace');
  const [executable, cli] = entry;
  const args = [
    cli,
    'lifecycle.scenario',
    '--shell=bash',
    `--module-format=${format}`,
    '--retry=1',
    '--timeout=1',
  ];
  if (mode === 'stdin' || mode.startsWith('tty')) args.push('--stdin');
  const command = !mode.startsWith('tty')
    ? [executable, ...args]
    : ['python3', path.join(__dirname, 'terminal.py'), executable, ...args];
  const child = spawn(command[0], command.slice(1), {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, LEIA_PROBE_TRACE: trace, LEIA_PROBE_MODE: mode },
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
  try {
    if (signal) {
      const until = Date.now() + 10000;
      while (!fs.existsSync(`${trace}.ready`)) {
        assert.equal(child.exitCode, null, output);
        assert.ok(Date.now() < until, `Signal readiness timeout: ${output}`);
        await pause(10);
      }
      child.kill(signal);
    }
    const code = await completion;
    const expectedCode = signal
      ? { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }[signal]
      : /failure|timeout/.test(mode)
        ? 1
        : 0;
    assert.equal(code, expectedCode, `${entry.join(' ')} ${format} ${mode}: ${output}`);
    if (mode === 'tty') assert.match(output, /4 passing/);
    const selected = mode.startsWith('setup-')
      ? 'setup'
      : mode.startsWith('cleanup-')
        ? 'cleanup'
        : 'test';
    const expected = ['setup', 'test', 'next', 'cleanup']
      .flatMap((stage) => {
        if (signal && selected !== 'cleanup' && stage === 'next') return [];
        if (signal && selected === 'setup' && stage === 'test') return [];
        const attempts = stage === selected && /failure|retry|timeout/.test(mode) ? 2 : 1;
        return Array.from({ length: attempts }, (_, retry) => `${stage}:${retry}\n`);
      })
      .join('');
    assert.equal(fs.readFileSync(trace, 'utf8'), expected, output);
    if (fs.existsSync(`${trace}.pids`)) {
      for (const pid of fs.readFileSync(`${trace}.pids`, 'utf8').trim().split('\n').map(Number)) {
        // Linux may retain an orphan zombie briefly; it must not be executing.
        let alive = true;
        try {
          process.kill(pid, 0);
        } catch {
          alive = false;
        }
        if (alive && process.platform === 'linux') {
          const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
          alive = !stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z');
        }
        assert.equal(alive, false, `Child ${pid} survived ${mode}`);
      }
    }
  } finally {
    clearTimeout(deadline);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await completion;
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

(async () => {
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
      if (process.platform !== 'win32')
        for (const mode of ['tty', 'tty-timeout']) await verify(entry, format, mode);
      if (process.platform !== 'win32')
        for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
          for (const mode of ['signal', 'setup-signal', 'cleanup-signal'])
            await verify(entry, format, mode, signal);
    }
  }
  process.stdout.write('Source/build lifecycle parity passed in both module formats.\n');
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
