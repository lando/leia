'use strict';

// Modules
const ErrorHandler = require('./error');
const Log = require('./log');

module.exports = class Leia {
  constructor({logLevelConsole = 'info'} = {}) {
    const log = new Log({logLevelConsole});
    // Return the leia instance
    return {
      error: new ErrorHandler(log),
      find: require('./find'),
      generate: require('./generate'),
      log,
      parse: require('./parse'),
    };
  }
};
