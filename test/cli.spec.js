/**
 * Tests for the Leia CLI contract.
 * @file cli.spec.js
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const chai = require('@lando/chai');

const numericOption = require('../lib/numeric-option');

chai.should();

describe('CLI numeric and failure compatibility', () => {
  it('should parse retry and timeout as non-negative integers', () => {
    numericOption.retry('0').should.equal(0);
    numericOption.retry('4').should.equal(4);
    numericOption.retry('9007199254740991').should.equal(Number.MAX_SAFE_INTEGER);
    numericOption.timeout('0').should.equal(0);
    numericOption.timeout('1800').should.equal(1800);
  });

  it('should reject invalid retry values with an actionable error', () => {
    ['nope', '-1', '1.5', '1retry', '9007199254740992'].forEach((retry) => {
      (() => numericOption.retry(retry)).should.throw('--retry must be an integer between 0 and');
    });
  });

  it('should reject invalid timeout values with an actionable error', () => {
    ['nope', '-1', '1.5', '5seconds', '2147484'].forEach((timeout) => {
      (() => numericOption.timeout(timeout)).should.throw(
        '--timeout must be an integer between 0 and 2147483',
      );
    });
  });
  it('should fail the CLI and run cleanup after a failing test', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-lifecycle-'));
    const trace = path.join(tempDir, 'trace');
    const result = spawnSync(
      'bun',
      [
        path.resolve(__dirname, '..', 'app', 'bin', 'leia.ts'),
        path.resolve(__dirname, 'lifecycle-failure.md'),
        '--retry',
        '0',
        '--shell',
        'bash',
      ],
      {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        env: {
          ...process.env,
          LEIA_LIFECYCLE_TRACE: trace.split(path.sep).join('/'),
          TERM: 'xterm',
        },
      },
    );

    try {
      chai.expect(result.error).to.equal(undefined);
      chai.expect(result.status, result.stderr || result.stdout).to.equal(1);
      fs.readFileSync(trace, 'utf8').should.equal('setup\ntest\ncleanup\n');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
