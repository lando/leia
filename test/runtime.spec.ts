import assert from 'node:assert/strict';

import { Lifecycle } from '../lib/runtime.ts';

describe('lib/runtime', () => {
  it('should cancel cleanup when the first signal arrives during cleanup', () => {
    const lifecycle = new Lifecycle();
    lifecycle.activeStage = 'cleanup';
    lifecycle.interrupt('SIGINT');
    assert.equal(lifecycle.cleanup.signal.aborted, true);
  });
  it('should reserve cleanup for the first interrupt and cancel it on a second interrupt', () => {
    const lifecycle = new Lifecycle();
    lifecycle.interrupt('SIGINT');
    assert.equal(lifecycle.commands.signal.aborted, true);
    assert.equal(lifecycle.cleanup.signal.aborted, false);
    lifecycle.interrupt('SIGTERM');
    assert.equal(lifecycle.cleanup.signal.aborted, true);
    assert.equal(lifecycle.signal, 'SIGINT');
  });
});
