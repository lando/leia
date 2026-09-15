import assert from 'node:assert/strict';
import path from 'node:path';

import { executionTarget } from '../utils/execution-target.ts';

describe('tooling/utils/execution-target', () => {
  it('should keep source, ESM, and CommonJS execution distinct', () => {
    const root = path.resolve('package');
    assert.equal(executionTarget('source', root).cli, path.join(root, 'bin/leia.ts'));
    assert.equal(executionTarget('source', root).executable, 'bun');
    assert.equal(executionTarget('esm', root).cli, path.join(root, 'dist/esm/bin/leia.js'));
    assert.equal(executionTarget('cjs', root).cli, path.join(root, 'dist/cjs/bin/leia.cjs'));
    assert.equal(executionTarget('cjs', root).executable, 'node');
  });
  it('should reject missing and obsolete build target names', () => {
    for (const name of ['', 'built', 'commonjs', 'unknown'])
      assert.throws(() => executionTarget(name, '.'), /Unknown Leia execution target/);
  });
});
