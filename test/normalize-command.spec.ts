import assert from 'node:assert/strict';
import os from 'node:os';

import { loadSubject } from './subject.ts';

const { normalizeCommand } = await loadSubject('utils/normalize-command');

describe('utils/normalize-command', () => {
  it('should remove labels and fold continuations without interpreting shell expressions', () => {
    assert.equal(
      normalizeCommand(
        '# label\r\n  echo first \\\r\n  second\r\n echo "${HOME}" $(pwd) `date`',
        'bash',
      ),
      ['echo first  second', 'echo "${HOME}" $(pwd) `date`'].join(os.EOL),
    );
  });
  it('should preserve empty commands and add PowerShell failure propagation once', () => {
    assert.equal(normalizeCommand('', 'sh'), '');
    assert.equal(normalizeCommand('skip', 'sh'), 'skip');
    for (const shell of ['pwsh', 'powershell'])
      assert.equal(
        normalizeCommand('# label\nWrite-Output "$HOME"', shell),
        ['$ErrorActionPreference = "Stop"', 'Write-Output "$HOME"'].join(os.EOL),
      );
  });
});
