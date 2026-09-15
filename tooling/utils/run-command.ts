import assert from 'node:assert/strict';

/** Drain both streams before checking status so failed packaging commands retain their evidence. */
export async function runCommand(
  root: string,
  command: string[],
  expectedCode = 0,
): Promise<string> {
  const child = Bun.spawn(command, {
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
