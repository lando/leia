import assert from 'node:assert/strict';

import { Leia } from '../lib/leia.ts';

describe('leia', () => {
  describe('#Leia', () => {
    it('should return a Leia instance with correct default options', () => {
      const leia = new Leia();
      assert.equal(typeof leia, 'object');
      assert.equal(typeof leia.resolveModuleFormat, 'function');
      assert.equal(typeof leia.runAsync, 'function');
    });
  });
});
