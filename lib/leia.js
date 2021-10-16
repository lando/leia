'use strict';

module.exports = class Leia {
  constructor({debugname = 'leia'} = {}) {
    // Return the leia instance
    return {
      find: require('./find'),
      generate: require('./generate'),
      debug: require('debug')(debugname),
      parse: require('./parse'),
    };
  }
};
