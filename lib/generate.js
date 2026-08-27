'use strict';

const _ = require('lodash');
const debug = require('debug')('leia:generate');
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

module.exports = (tests, opts = {strip: false}) => {
  // Template dir and files
  const templateDir = path.resolve(__dirname, '..', 'templates');
  const templates = {
    commonjs: path.join(templateDir, 'leia.commonjs.test.jst'),
    esm: path.join(templateDir, 'leia.esm.test.jst'),
  };
  const renders = {};

  // Loop through our tests and dump stuff
  _.forEach(tests, (test) => {
    const moduleFormat = test.moduleFormat || opts.moduleFormat || 'commonjs';
    const templateFile = templates[moduleFormat];
    if (!templateFile) throw new Error(`Cannot generate unsupported module format "${moduleFormat}".`);

    if (!renders[moduleFormat]) {
      debug('getting render function using template: %o and opts: %o', templateFile, opts);
      renders[moduleFormat] = getRenderFunction(templateFile, opts);
    }

    // @TODO: do we want a stronger check that this dir is set up how we need it?
    debug('insuring directory exists and is ready to go %o ', path.dirname(test.destination));
    fs.mkdirpSync(path.dirname(test.destination));

    // Build and generate all our test scripts and make them executable
    _(test.tests)
      .filter((value, key) => key !== 'invalid')
      .flatten()
      .map((data) => {
        debug('generating script to %o and making it executable', data.script);
        fs.writeFileSync(data.script, data.command);
        fs.chmodSync(data.script, '755');
        return data.script;
      })
      .value();

    // Write the mocha test out
    debug('generating test %o from %o to %o', test.id, test.file, test.destination);
    fs.writeFileSync(test.destination, renders[moduleFormat](test));
  });

  // Return list of tests that we can run
  return _(tests)
    .map((test) => test.destination)
    .value();
};
