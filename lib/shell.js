'use strict';

const _ = require('lodash');
const path = require('path');

const userShell = () => {
  const {env} = process;

  if (process.platform === 'win32') {
    // If shell exists then grab that right away
    if (env.SHELL) return env.SHELL;
    // If we are on MING64 then return bash.exe
    if (env.MSYSTEM === 'MINGW64') return 'bash.exe';
    // Finally fallback to COMSPEC
    return env.COMSPEC || 'cmd.exe';
  }

  try {
    const {shell} = userInfo();
    if (shell) {
      return shell;
    }
  } catch {}

  if (process.platform === 'darwin') {
    return env.SHELL || '/bin/zsh';
  }

  return env.SHELL || '/bin/sh';
};

module.exports = (shell = userShell()) => {
  // Get some basic information about our thing
  const data = {binary: shell, name: path.parse(shell).name, extension: '.sh'};

  // Return helpful data about our shell
  switch (data.name) {
  case 'bash':
    return _.assign(data, {args: ['--noprofile', '--norc', '-eo', 'pipefail', '{0}']});
  case 'cmd':
    return _.assign(data, {
      binary: 'cmd.exe',
      args: ['/D', '/E:ON', '/V:OFF', '/S', '/C', 'CALL', '{0}'],
      extension: '.cmd',
    });
  case 'pwsh':
    return _.assign(data, {
      binary: 'pwsh.exe',
      args: ['-command', '.', '{0}'],
      extension: '.ps1',
    });
  case 'powershell':
    return _.assign(data, {
      binary: 'powershell.exe',
      args: ['-command', '.', '{0}'],
      extension: '.ps1',
    });

  case 'sh':
    return _.assign(data, {args: ['-e', '{0}']});
  case 'zsh':
    return _.assign(data, {args: ['--norcs', '-eo', 'pipefail', '{0}']});

  default:
    return {binary: 'sh', name: 'sh', args: ['-e', '{0}'], extension: '.sh'};
  }
};
