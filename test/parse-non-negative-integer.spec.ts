import assert from 'node:assert/strict';

import { loadSubject } from './subject.ts';

const { parseNonNegativeInteger } = await loadSubject('utils/parse-non-negative-integer');

describe('utils/parse-non-negative-integer', () => {
  it('should accept exact inclusive bounds and decimal digit strings', () => {
    for (const value of [0, '0', 3, '003'])
      assert.equal(parseNonNegativeInteger(value, '--limit', 3), Number(value));
  });
  it('should reject coercible non-integers, unsafe values, and values outside the bound', () => {
    for (const value of [
      null,
      true,
      {},
      [],
      '',
      ' ',
      ' 1',
      '1 ',
      '+1',
      '-1',
      '1e0',
      '1.0',
      0.5,
      -1,
      4,
      Infinity,
      NaN,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      assert.throws(() => parseNonNegativeInteger(value, '--limit', 3), {
        message: '--limit must be an integer between 0 and 3.',
      });
    }
  });
});
