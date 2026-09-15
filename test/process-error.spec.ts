import assert from 'node:assert/strict';

import { processError } from '../utils/process-error.ts';
import type { ProcessResult } from '../lib/execute.ts';

const success: ProcessResult = {
  code: 0,
  signal: null,
  stdout: 'out',
  stderr: 'err',
  error: null,
  timedOut: false,
  cancelled: false,
};

describe('utils/process-error', () => {
  it('should accept only a clean successful completion', () => {
    assert.equal(processError(success), undefined);
    assert.equal(
      processError({ ...success, code: 7 })?.message,
      'CODE: 7\nSTDOUT: out\nSTDERR: err',
    );
    assert.equal(
      processError({ ...success, code: null })?.message,
      'CODE: null\nSTDOUT: out\nSTDERR: err',
    );
  });
  it('should retain timeout, cancellation, signal, and spawn-error precedence', () => {
    const error = Object.assign(new Error('missing executable'), { code: 'ENOENT' });
    const failed = {
      ...success,
      error,
      signal: 'SIGTERM' as const,
      cancelled: true,
      timedOut: true,
    };
    assert.equal(
      processError(failed)?.message,
      'CODE: ETIMEDOUT\nSTDOUT: out\nSTDERR: err\nmissing executable',
    );
    assert.match(processError({ ...failed, timedOut: false })!.message, /^CODE: ABORT_ERR\n/);
    assert.match(
      processError({ ...failed, timedOut: false, cancelled: false })!.message,
      /^CODE: SIGTERM\n/,
    );
    assert.match(processError({ ...success, error })!.message, /^CODE: ENOENT\n/);
  });
});
