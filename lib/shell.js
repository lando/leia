'use strict';

const _ = require('lodash');
const debug = require('debug')('leia:shell');
const path = require('path');

const userShell = () => {
  const {env} = process;

  if (process.platform === 'win32') {
    if (env.SHELL) return env.SHELL;
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
  debug('using shell %o', data);

  // Return helpful data about our shell
  switch (data.name) {
  case 'bash':
    return _.assign(data, {args: ['--noprofile', '--norc', '-eo', 'pipefail', '{0}']});
  case 'sh':
    return _.assign(data, {args: ['-e', '{0}']});
  case 'zsh':
    return _.assign(data, {args: ['--norcs', '-eo', 'pipefail', '{0}']});
  case 'cmd':
    return _.assign(data, {args: ['/D', '/E:ON', '/V:OFF', '/S', '/C', '"CALL \"{0}\""'], extension: '.cmd'});
  default:
    return {binary: 'sh', name: 'sh', args: ['-e', '{0}'], extension: '.sh'};
  }
};
