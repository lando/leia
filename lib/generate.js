'use strict';

const _ = require('lodash');
const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

/**
 * Takes an array of parsed leia test metadata and generates mocha cli tests
 *
 * @since 0.1.0
 * @param {Array} tests An array of parsed leia test metadata
 * @param {Object} [opts] Options to pass to the dot template engine
 * @param {Boolean} [opts.strip=false] Strips things
 * @return {Array} An array of unique absolute filepaths
 */
module.exports = (tests, opts = {strip: false}) => {
  // Template dir
  const templateDir = path.resolve(__dirname, '..', 'templates');
  // Get the deffiles
  const defFiles = _(fs.readdirSync(templateDir))
    .filter(file => _.endsWith(file, '.def'))
    .map(file => path.join(templateDir, file))
    .value();
  // Build a defs object
  const defs = {};
  _.forEach(defFiles, file => {
    defs[path.basename(file, '.def')] = fs.readFileSync(file, 'utf8');
  });
  // Get our template function
  const templateFile = path.join(templateDir, 'func.test.jst');
  const render = dot.template(fs.readFileSync(templateFile, 'utf8'), _.merge({}, dot.templateSettings, opts), defs);
  // Generate the test files
  return _(tests)
    .map(test => fs.writeFileSync(test.output, render(test)) ? test.output : test.output)
    .value();
};

