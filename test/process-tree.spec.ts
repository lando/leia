import assert from 'node:assert/strict';

import { processTree } from '../utils/process-tree.ts';

describe('utils/process-tree', () => {
  it('should terminate descendants before parents without selecting the caller or siblings', () => {
    const snapshot = '50 30\n 10 1\n40 20\n30 20\n20 10\n60 10\n';
    const targets = processTree(snapshot, 20);
    assert.deepEqual(new Set(targets), new Set([20, 30, 40, 50]));
    assert.ok(targets.indexOf(50) < targets.indexOf(30));
    assert.ok(targets.indexOf(30) < targets.indexOf(20));
    assert.ok(targets.indexOf(40) < targets.indexOf(20));
  });
  it('should ignore malformed rows and terminate on duplicates or cycles', () => {
    assert.deepEqual(processTree('PID PPID\n0 20\n-2 20\nNaN 20\n1.5 20\n30 20 extra\n', 20), [20]);
    assert.deepEqual(processTree('30 20\n30 20\n20 30', 20), [30, 20]);
    assert.deepEqual(processTree('', 20), [20]);
  });
});
