import assert from 'node:assert/strict';

import * as numericOption from '../lib/numeric-option.ts';

describe('lib/numeric-option', () => {
  it('should parse retry and timeout as non-negative integers', () => {
    assert.equal(numericOption.retry('0'), 0);
    assert.equal(numericOption.retry('4'), 4);
    assert.equal(numericOption.retry('9007199254740991'), Number.MAX_SAFE_INTEGER);
    assert.equal(numericOption.timeout('0'), 0);
    assert.equal(numericOption.timeout('1800'), 1800);
  });

  it('should reject invalid retry values with an actionable error', () => {
    ['nope', '-1', '1.5', '1retry', '9007199254740992'].forEach((retry) => {
      assert.throws(
        () => numericOption.retry(retry),
        (error: Error) => error.message.includes('--retry must be an integer between 0 and'),
      );
    });
  });

  it('should reject invalid timeout values with an actionable error', () => {
    ['nope', '-1', '1.5', '5seconds', '2147484'].forEach((timeout) => {
      assert.throws(
        () => numericOption.timeout(timeout),
        (error: Error) =>
          error.message.includes('--timeout must be an integer between 0 and 2147483'),
      );
    });
  });
});
