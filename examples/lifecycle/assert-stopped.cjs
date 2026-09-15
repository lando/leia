const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = (trace) => {
  if (!fs.existsSync(`${trace}.pids`)) return;
  for (const pid of fs.readFileSync(`${trace}.pids`, 'utf8').trim().split('\n').map(Number)) {
    let alive = true;
    try {
      process.kill(pid, 0);
      // An orphan zombie is no longer executing; Linux can retain it briefly.
      if (process.platform === 'linux') {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        alive = !stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z');
      }
    } catch (error) {
      if (error.code !== 'ESRCH' && error.code !== 'ENOENT') throw error;
      alive = false;
    }
    assert.equal(alive, false, `Child ${pid} survived into the next lifecycle boundary`);
  }
};
