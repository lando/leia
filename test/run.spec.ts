import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type Mocha from 'mocha';

import { loadSubject } from './subject.ts';

const { run, runAsync } = await loadSubject('lib/run');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-run-'));
const commonjsHarness = path.join(tempDir, 'passing.leia.cjs');
const esmHarness = path.join(tempDir, 'passing.leia.mjs');
const runMocha = (mocha: Mocha): Promise<number> => new Promise((resolve) => mocha.run(resolve));
const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
const signalListeners = () => signals.map((signal) => process.listeners(signal));

describe('lib/run', () => {
  before(() => {
    fs.writeFileSync(
      commonjsHarness,
      "describe('commonjs', () => { it('should pass', () => {}); });\n",
    );
    fs.writeFileSync(
      esmHarness,
      "describe('esm', () => { it('should pass', () => {}); });\nexport {};\n",
    );
    // Prepare all fixtures before imports so tests do not depend on loader directory-cache refresh.
    for (const format of ['cjs', 'mjs']) {
      for (const fail of [false, true])
        fs.writeFileSync(
          path.join(tempDir, `listeners-${fail}.leia.${format}`),
          `describe('signal scope', () => { it('should complete', () => { ${fail ? "throw new Error('expected failure');" : ''} }); });\n`,
        );
      fs.writeFileSync(
        path.join(tempDir, `broken.leia.${format}`),
        "throw new Error('harness loading failed');\n",
      );
    }
  });

  after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  it('should preserve the synchronous CommonJS runner API', async () => {
    const runner = run([commonjsHarness], { reporter: 'dot' });
    const failures = await runMocha(runner);
    assert.equal(failures, 0);
  });

  it('should direct ESM harnesses to the asynchronous API', () => {
    assert.throws(
      () => run([esmHarness], { reporter: 'dot' }),
      (error: Error) =>
        error.message.includes('ESM harnesses require the asynchronous runAsync() API.'),
    );
  });

  it('should load and run ESM harnesses asynchronously', async () => {
    const runner = await runAsync([esmHarness], { reporter: 'dot' });
    const failures = await runMocha(runner);
    assert.equal(failures, 0);
  });

  it('should reject invalid timeout values before loading harnesses', () => {
    ['nope', '-1', '1.5', '5seconds', '2147484'].forEach((timeout) => {
      assert.throws(
        () => run([commonjsHarness], { timeout }),
        (error: Error) =>
          error.message.includes('--timeout must be an integer between 0 and 2147483'),
      );
    });
  });

  for (const format of ['cjs', 'mjs']) {
    it(`should scope signal handlers to a ${format} run on success and failure`, async () => {
      for (const fail of [false, true]) {
        const harness = path.join(tempDir, `listeners-${fail}.leia.${format}`);
        const before = signalListeners();
        const runner = await runAsync([harness]);
        assert.deepEqual(signalListeners(), before, 'Loading must not attach handlers');
        let attached = false;
        runner.suite.beforeAll('check active handlers', () => {
          signals.forEach((signal, index) => {
            const listeners = process.listeners(signal);
            assert.equal(listeners.length, before[index]!.length + 1);
            assert.ok(before[index]!.every((listener) => listeners.includes(listener)));
          });
          attached = true;
        });
        assert.equal(await runMocha(runner), fail ? 1 : 0);
        assert.equal(attached, true);
        assert.deepEqual(signalListeners(), before, 'Completion must restore existing handlers');
      }
    });

    it(`should leave signal handlers untouched when a ${format} harness fails to load`, async () => {
      const harness = path.join(tempDir, `broken.leia.${format}`);
      const before = signalListeners();
      await assert.rejects(runAsync([harness]), /harness loading failed/);
      assert.deepEqual(signalListeners(), before);
    });
  }
});
