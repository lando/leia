import assert from 'node:assert/strict';
import { execute, processError } from '../lib/execute.ts';
import { Lifecycle } from '../lib/runtime.ts';

describe('typed execution boundary', () => {
  it('drains both output streams, propagates cwd/environment, and closes unattached stdin', async () => {
    const result = await execute({
      shell: process.execPath,
      args: [
        '-e',
        "process.stdin.resume(); process.stdin.on('end', () => { process.stdout.write(process.cwd() + ':' + process.env.LEIA_PROBE); process.stderr.write('stderr'); });",
      ],
      stdin: 'pipe',
      cwd: process.cwd(),
      env: { ...process.env, LEIA_PROBE: 'value' },
      timeout: 2000,
    });
    assert.equal(result.stdout, `${process.cwd()}:value`);
    assert.equal(result.stderr, 'stderr');
    assert.equal(processError(result), undefined);
  });
  it('reports a nonzero exit and spawn errors without duplicate completion', async () => {
    const result = await execute({
      shell: process.execPath,
      args: ['-e', "process.stdout.write('out'); process.stderr.write('err'); process.exitCode=7"],
      stdin: 'pipe',
    });
    assert.match(processError(result)!.message, /CODE: 7\nSTDOUT: out\nSTDERR: err/);
    const missing = await execute({
      shell: 'leia-nonexistent-executable-65',
      args: [],
      stdin: 'pipe',
    });
    assert.match(processError(missing)!.message, /ENOENT/);
  });
  it('waits for child termination on timeout', async () => {
    const result = await execute({
      shell: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      stdin: 'pipe',
      timeout: 50,
    });
    assert.equal(result.timedOut, true);
    assert.match(processError(result)!.message, /ETIMEDOUT/);
  });
  it('does not spawn a pre-cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await execute({
      shell: 'must-not-exist',
      args: [],
      stdin: 'pipe',
      signal: controller.signal,
    });
    assert.equal(result.cancelled, true);
    assert.equal(result.error, null);
    assert.match(processError(result)!.message, /ABORT_ERR/);
  });

  it('treats a signal-only child exit as failure', async function () {
    if (process.platform === 'win32') this.skip();
    const result = await execute({
      shell: process.execPath,
      args: ['-e', "process.kill(process.pid, 'SIGTERM')"],
      stdin: 'pipe',
    });
    assert.equal(result.code, null);
    assert.equal(result.signal, 'SIGTERM');
    assert.match(processError(result)!.message, /CODE: SIGTERM/);
  });

  it('cancels cleanup when the first signal arrives during cleanup', () => {
    const lifecycle = new Lifecycle();
    lifecycle.activeStage = 'cleanup';
    lifecycle.interrupt('SIGINT');
    assert.equal(lifecycle.cleanup.signal.aborted, true);
  });
  it('reserves cleanup for the first interrupt and cancels it on a second interrupt', () => {
    const lifecycle = new Lifecycle();
    lifecycle.interrupt('SIGINT');
    assert.equal(lifecycle.commands.signal.aborted, true);
    assert.equal(lifecycle.cleanup.signal.aborted, false);
    lifecycle.interrupt('SIGTERM');
    assert.equal(lifecycle.cleanup.signal.aborted, true);
    assert.equal(lifecycle.signal, 'SIGINT');
  });
});
