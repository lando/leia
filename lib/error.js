'use strict';

// Modules
const Log = require('./log');

module.exports = class ErrorHandler {
  constructor(log = new Log()) {
    this.log = log;
  };

  handle({message, stack, code = 1, hide = false, verbose = 0} = {}) {
    // Log error or not
    if (!hide) {
      if (verbose > 0) this.log.error(stack);
      else this.log.error(message);
    }
    // Report error if we can
    return code;
  };
};
