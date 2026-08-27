'use strict';

// Modules
const path = require('path');

const _ = require('lodash');
const debug = require('debug')('leia:run');
const Mocha = require('mocha');
const validateTimeout = require('./numeric-option').timeout;

const createRunner = (tests, options) => {
  // calculate the timeout
  const timeout = validateTimeout(options?.timeout ?? 1800) * 1000;

  // Instantiate a Mocha instance.
  const mocha = new Mocha(_.merge({}, {timeout}));

  // Throw an error if there are no tests
  if (_.isEmpty(tests)) throw Error('You must pass in some tests!');

  // Add all our tests
  _.forEach(tests, (test) => {
    debug('adding %o to the test runner with timeout %o', test, `${timeout}ms`);
    mocha.addFile(test);
  });

  // Run the test runner.
  return mocha;
};

module.exports = (tests, options) => {
  if (_.some(tests, (test) => path.extname(test) === '.mjs')) {
    throw new Error('ESM harnesses require the asynchronous runAsync() API.');
  }

  return createRunner(tests, options);
};

module.exports.async = async(tests, options) => {
  const mocha = createRunner(tests, options);
  await mocha.loadFilesAsync();
  return mocha;
};
