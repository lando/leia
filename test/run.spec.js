/**
 * Tests for the Mocha runner.
 * @file run.spec.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const chai = require('@lando/chai');
const fsExtra = require('fs-extra');

const run = require('../lib/run');

chai.should();

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-run-'));
const commonjsHarness = path.join(tempDir, 'passing.leia.cjs');
const esmHarness = path.join(tempDir, 'passing.leia.mjs');
const runMocha = (mocha) => new Promise((resolve) => mocha.run(resolve));

describe('lib/run', () => {
  before(() => {
    fs.writeFileSync(commonjsHarness, "describe('commonjs', () => { it('passes', () => {}); });\n");
    fs.writeFileSync(esmHarness, "describe('esm', () => { it('passes', () => {}); });\nexport {};\n");
  });

  after(() => fsExtra.removeSync(tempDir));

  it('should preserve the synchronous CommonJS runner API', async() => {
    const runner = run([commonjsHarness], {reporter: 'dot'});
    const failures = await runMocha(runner);
    failures.should.equal(0);
  });

  it('should direct ESM harnesses to the asynchronous API', () => {
    (() => run([esmHarness], {reporter: 'dot'})).should.throw(
      'ESM harnesses require the asynchronous runAsync() API.',
    );
  });

  it('should load and run ESM harnesses asynchronously', async() => {
    const runner = await run.async([esmHarness], {reporter: 'dot'});
    const failures = await runMocha(runner);
    failures.should.equal(0);
  });
});
