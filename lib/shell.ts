import os from 'node:os';
import path from 'node:path';

import type { Shell } from './compiler-types.ts';

const userShell = (): string => {
  const { env } = process;

  if (process.platform === 'win32') {
    // if shell exists then grab that right away
    if (env.SHELL) return env.SHELL;
    // if we are on `MING64` then return bash.exe
    if (env.MSYSTEM === 'MINGW64') return 'bash.exe';
    // finally fall back to `COMSPEC`
    return env.COMSPEC || 'cmd.exe';
  }

  const { shell } = os.userInfo();
  if (shell) return shell;

  if (process.platform === 'darwin') {
    return env.SHELL || '/bin/zsh';
  }

  return env.SHELL || '/bin/sh';
};

/**
 * resolves a shell binary into leia's deterministic invocation shape.
 *
 * known bash, cmd, powershell, sh, and zsh names receive platform-specific arguments. unknown
 * names fall back to `sh`.
 *
 * @param shell shell binary or path. defaults to leia's platform and account-shell selection.
 * @returns the binary, normalized name, script extension, and invocation arguments.
 */
export const getShell = (shell: string = userShell()): Shell => {
  // get some basic information about our thing
  const data = { binary: shell, name: path.parse(shell).name, extension: '.sh' };

  // return helpful data about our shell
  switch (data.name) {
    case 'bash':
      return Object.assign(data, { args: ['--noprofile', '--norc', '-eo', 'pipefail', '{0}'] });
    case 'cmd':
      return Object.assign(data, {
        binary: 'cmd.exe',
        args: ['/D', '/E:ON', '/V:OFF', '/S', '/C', 'CALL', '{0}'],
        extension: '.cmd',
      });
    case 'pwsh':
      return Object.assign(data, {
        binary: 'pwsh.exe',
        args: ['-command', '.', '{0}'],
        extension: '.ps1',
      });
    case 'powershell':
      return Object.assign(data, {
        binary: 'powershell.exe',
        args: ['-command', '.', '{0}'],
        extension: '.ps1',
      });

    case 'sh':
      return Object.assign(data, { args: ['-e', '{0}'] });
    case 'zsh':
      return Object.assign(data, { args: ['--norcs', '-eo', 'pipefail', '{0}'] });

    default:
      return { binary: 'sh', name: 'sh', args: ['-e', '{0}'], extension: '.sh' };
  }
};

export type { Shell } from './compiler-types.ts';
