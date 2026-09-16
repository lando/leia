import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** drain both streams before checking status so failed packaging commands retain their evidence. */
export async function runCommand(
  root: string,
  command: string[],
  expectedCode = 0,
): Promise<string> {
  // windows npm is a command shim, not an executable accepted by bun.spawn.
  const invocation = [...command];
  if (process.platform === 'win32' && command[0] === 'npm') {
    const shim = Bun.which('npm.cmd');
    assert.ok(shim, 'npm.cmd must be available on PATH.');
    const cli = join(dirname(shim), 'node_modules/npm/bin/npm-cli.js');
    assert.ok(existsSync(cli), `Cannot locate npm CLI beside ${shim}`);
    invocation.splice(0, 1, 'node', cli);
  }
  const child = Bun.spawn(invocation, {
    cwd: root,
    env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120000,
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  assert.equal(code, expectedCode, `${command.join(' ')}\n${stderr}\n${stdout}`);
  return stdout;
}
