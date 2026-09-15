const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const assertStopped = require('./assert-stopped.cjs');

const { LEIA_PROBE_TRACE: trace, LEIA_PROBE_MODE: mode } = process.env;
const stage = process.argv[2];
assertStopped(trace);
assert.equal(process.cwd(), __dirname);
assert.equal(process.env.LEIA_TEST_STAGE, stage === 'next' ? 'test' : stage.split('-')[0]);
assert.equal(process.env.LEIA_TEST_ID, 'lifecycle.scenario');
assert.equal(process.env.LEIA_TEST_NUMBER, stage.includes('next') ? '2' : '1');
for (const variable of ['LEIA', 'LEIA_ENVIRONMENT', 'LEIA_TEST_RUNNING', 'LEIA_PARSER_RUNNING'])
  assert.equal(process.env[variable], 'true');
assert.equal(process.env.LEIA_VERSION, require('../../package.json').version);
assert.equal(process.env.LEIA_PARSER_VERSION, process.env.LEIA_VERSION);
assert.equal(process.env.LEIA_PARSER_ID, 'lifecycle-contract');
assert.equal(process.env.LEIA_PARSER_RETRY, process.env.LEIA_PROBE_RETRY);
assert.equal(Boolean(process.stdin.isTTY), mode.startsWith('tty'));
assert.equal(Boolean(process.stdout.isTTY), false);
assert.equal(Boolean(process.stderr.isTTY), false);
fs.appendFileSync(trace, `${stage}:${process.env.LEIA_TEST_RETRY}\n`);

const selected = mode.startsWith('setup-')
  ? 'setup'
  : mode.startsWith('cleanup-')
    ? 'cleanup'
    : 'test';
if (stage === selected || (mode === 'double-signal' && stage === 'cleanup')) {
  if (mode.endsWith('failure')) {
    process.stdout.write('lifecycle stdout marker\n');
    process.stderr.write('lifecycle stderr marker\n');
    process.exitCode = 7;
  } else if (mode.endsWith('retry') && process.env.LEIA_TEST_RETRY === '0') process.exitCode = 8;
  else if (mode.endsWith('timeout') || mode.endsWith('signal')) {
    const descendant = spawn(process.execPath, [path.join(__dirname, 'survivor.cjs')], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });
    fs.appendFileSync(`${trace}.pids`, `${process.pid}\n${descendant.pid}\n`);
    // Signal only once the descendant has installed its SIGTERM handler.
    descendant.once('message', () => fs.writeFileSync(`${trace}.${stage}.ready`, 'ready'));
    setInterval(() => {}, 1000);
  } else if (mode === 'no-deadline') {
    setTimeout(() => fs.writeFileSync(`${trace}.deadline`, 'completed'), 1100);
  } else if (mode === 'stdin' || mode === 'eof') {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      assert.equal(input, mode === 'stdin' ? 'input\n' : '');
    });
  } else if (mode === 'tty') {
    assert.equal(Boolean(process.stdin.isTTY), true);
    process.stdin.once('data', (data) => {
      assert.equal(data.toString().trim(), 'input');
      process.stdin.pause();
    });
  }
}
