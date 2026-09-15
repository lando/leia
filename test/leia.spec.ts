import assert from 'node:assert/strict';

import { loadSubject } from './subject.ts';

const { Leia } = await loadSubject('lib/leia');

describe('lib/leia', () => {
  describe('#Leia', () => {
    it('should return a Leia instance with correct default options', () => {
      const leia = new Leia();
      assert.equal(typeof leia, 'object');
      assert.equal(typeof leia.resolveModuleFormat, 'function');
      assert.equal(typeof leia.runAsync, 'function');
    });
  });
});
