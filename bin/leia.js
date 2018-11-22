#!/usr/bin/env node

/**
 * Main CLI entrypoint to use the Leia libraries
 * This file is meant to be linked as a "leia" executable.
 */

'use strict';

// Modules
const path = require('path');
const yargonaut = require('yargonaut');
yargonaut.style('green').errorsStyle('red');
const yargs = require('yargs');

// Print the CLI
yargs
  .option('verbose', {
    alias: 'v',
    count: 'verbose',
    describe: 'Change verbosity level',
  })
  .commandDir(path.resolve(__dirname, '..', 'commands'))
  .wrap(yargs.terminalWidth() * 0.75)
  .help()
  .argv;

