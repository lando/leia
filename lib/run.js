'use strict';

// Modules
const _ = require('lodash');
const debug = require('debug')('leia:run');
const Mocha = require('mocha');

module.exports = (tests, options) => {
  // calculate the timeout
  const timeout = parseInt(options?.timeout ?? 30) * 60 * 1000;

  // Instantiate a Mocha instance.
  const mocha = new Mocha(_.merge({}, {timeout}));

  // Throw an error if there are no tests
  if (_.isEmpty(tests)) throw Error('You must pass in some tests!');

  // Add all our tests
  _.forEach(tests, (test) => {
    debug('adding %o to the test runner with timeout %o', test, timeout);
    mocha.addFile(test);
  });

  // Run the test runner.
  return mocha;
};
