'use strict';

// Modules
const _ = require('lodash');
const debug = require('debug')('leia:run');
const Mocha = require('mocha');

module.exports = (tests, options) => {
  // Instantiate a Mocha instance.
  const mocha = new Mocha(_.merge({}, {timeout: 900000}, options));

  // Add all our tests
  _.forEach(tests, (test) => {
    debug('adding %s to the test runner', test);
    mocha.addFile(test);
  });

  // Run the test runner.
  return mocha;
};

