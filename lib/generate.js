'use strict';

const _ = require('lodash');
const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

// Get our def files
const getDefFiles = (dir) => _(fs.readdirSync(dir))
  .filter((file) => _.endsWith(file, '.def'))
  .map((file) => path.join(dir, file))
  .value();

/*
 * Helper to get render function
 */
const getRenderFunction = (template, opts = {}) => {
  // Get our def files
  const defFiles = getDefFiles(opts.defsDir || path.dirname(template));

  // Build a defs object
  const defs = {};
  _.forEach(defFiles, (file) => {
    defs[path.basename(file, '.def')] = fs.readFileSync(file, 'utf8');
  });

  return dot.template(fs.readFileSync(template, 'utf8'), _.merge({}, dot.templateSettings, opts), defs);
};


/**
 * Takes an array of parsed leia test metadata and generates mocha cli tests
 *
 * @since 0.5.0
 * @param {Array} tests An array of parsed leia test metadata
 * @param {Object} [opts] Options to pass to the dot template engine
 * @param {Boolean} [opts.strip=false] Strips things
 * @return {Array} An array of unique absolute filepaths
 */
module.exports = (tests, opts = {strip: false}) => {
  // Debuger
  const debug = require('debug')('leia:generate');
  // Template dir and files
  const templateDir = path.resolve(__dirname, '..', 'templates');
  const templateFile = path.join(templateDir, 'leia.test.jst');

  // Get render function
  debug('getting render function using template: %s and opts: %o', templateDir, opts);
  const render = getRenderFunction(templateFile, opts);

  // Loop through our tests and dump stuff
  _.forEach(tests, (test) => {
    // @TODO: do we want a stronger check that this dir is set up how we need it?
    debug('insuring directory exists and is ready to go %s ', path.dirname(test.destination));
    fs.mkdirpSync(path.dirname(test.destination));

    // Build and generate all our test scripts and make them executable
    _(test.tests)
      .filter((value, key) => key !== 'nope')
      .flatten()
      .map((data) => {
        debug('generating script to %s and making it executable', data.script);
        fs.writeFileSync(data.script, data.command);
        fs.chmodSync(data.script, '755');
        return data.script;
      })
      .value();

    // Write the mocha test out
    debug('generating test %s from %s to %s', test.id, test.file, test.destination);
    fs.writeFileSync(test.destination, render(test));
  });

  // Return list of tests that we can run
  return _(tests)
    .map((test) => test.destination)
    .value();
};
