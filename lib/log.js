'use strict';

// Modules
const _ = require('lodash');
const winston = require('winston');
const logLevels = {
  '0': 'info',
  '1': 'verbose',
  '2': 'debug',
  '3': 'silly',
};

module.exports = class Log extends winston.Logger {
  constructor(opts = {logLevelConsole: 'info', logLevel: 'debug'}) {
    // If loglevelconsole is numeric lets map it!
    if (_.isInteger(opts.logLevelConsole)) opts.logLevelConsole = logLevels[opts.logLevelConsole];

    // The default console transport
    const transports = [
      new winston.transports.Console({
        level: opts.logLevelConsole,
        colorize: true,
      }),
    ];

    super({transports: transports, exitOnError: true});
  }
};
