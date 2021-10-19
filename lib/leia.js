'use strict';

module.exports = class Leia {
  constructor({debugname = 'leia'} = {}) {
    return {
      find: require('./find'),
      generate: require('./generate'),
      debug: require('debug')(debugname),
      parse: require('./parse'),
    };
  }
};
