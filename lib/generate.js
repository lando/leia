'use strict';

const _ = require('lodash');
const debug = require('debug')('leia:generate');
const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

const validateRetry = require('./numeric-option').retry;

const assertString = (value, field) => {
  if (typeof value !== 'string') {
    throw new TypeError(`Generated harness metadata "${field}" must be a string.`);
  }

  return value;
};

const assertStringArray = (value, field) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`Generated harness metadata "${field}" must be an array of strings.`);
  }

  return value;
};

const assertInteger = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Generated harness metadata "${field}" must be a non-negative safe integer.`);
  }

  return value;
};

const toSourceLiteral = (value) => JSON.stringify(value)
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const prepareScenario = (scenario, section, index) => {
  const field = (name) => `tests.${section}[${index}].${name}`;

  assertString(scenario.script, field('script'));
  if (!Array.isArray(scenario.describe) || typeof scenario.describe[0] !== 'string') {
    throw new TypeError(`Generated harness metadata "${field('describe')}" must contain a string.`);
  }
  if (typeof scenario.skip !== 'boolean') {
    throw new TypeError(`Generated harness metadata "${field('skip')}" must be a boolean.`);
  }

  return {
    args: toSourceLiteral(assertStringArray(scenario.args, field('args'))),
    command: toSourceLiteral(assertString(scenario.command, field('command'))),
    describe: toSourceLiteral(scenario.describe[0]),
    id: toSourceLiteral(assertString(scenario.id, field('id'))),
    number: toSourceLiteral(assertInteger(scenario.number, field('number'))),
    section: toSourceLiteral(assertString(scenario.section, field('section'))),
    shell: toSourceLiteral(assertString(scenario.shell, field('shell'))),
    skip: scenario.skip,
  };
};

const prepareHarness = (test) => {
  if (!test.tests || typeof test.tests !== 'object' || Array.isArray(test.tests)) {
    throw new TypeError('Generated harness metadata "tests" must be an object.');
  }

  const scenarios = [];
  const tests = {};
  _.forEach(test.tests, (sectionTests, section) => {
    if (section === 'invalid') return;
    if (!Array.isArray(sectionTests)) {
      throw new TypeError(`Generated harness metadata "tests.${section}" must be an array.`);
    }

    scenarios.push(...sectionTests);
    tests[section] = sectionTests.map((scenario, index) => prepareScenario(scenario, section, index));
  });

  const stdin = assertString(test.stdin, 'stdin');
  if (!['inherit', 'pipe'].includes(stdin)) {
    throw new TypeError('Generated harness metadata "stdin" must be "inherit" or "pipe".');
  }

  return {
    renderData: {
      chaiPath: toSourceLiteral(assertString(test.chaiPath, 'chaiPath')),
      cltPath: toSourceLiteral(assertString(test.cltPath, 'cltPath')),
      cwd: toSourceLiteral(assertString(test.cwd, 'cwd')),
      debugPath: toSourceLiteral(assertString(test.debugPath, 'debugPath')),
      id: toSourceLiteral(assertString(test.id, 'id')),
      retry: toSourceLiteral(validateRetry(test.retry)),
      stdin: toSourceLiteral(stdin),
      tests,
      version: toSourceLiteral(assertString(test.version, 'version')),
    },
    scenarios,
  };
};

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
    assertString(test.destination, 'destination');
    const {renderData, scenarios} = prepareHarness(test);

    if (!renders[moduleFormat]) {
      debug('getting render function using template: %o and opts: %o', templateFile, opts);
      renders[moduleFormat] = getRenderFunction(templateFile, opts);
    }

    // @TODO: do we want a stronger check that this dir is set up how we need it?
    debug('insuring directory exists and is ready to go %o ', path.dirname(test.destination));
    fs.mkdirpSync(path.dirname(test.destination));

    // Build and generate all our test scripts and make them executable
    _(scenarios)
      .map((data) => {
        debug('generating script to %o and making it executable', data.script);
        fs.writeFileSync(data.script, data.command);
        fs.chmodSync(data.script, '755');
        return data.script;
      })
      .value();

    // Write the mocha test out
    debug('generating test %o from %o to %o', test.id, test.file, test.destination);
    fs.writeFileSync(test.destination, renders[moduleFormat](renderData));
  });

  // Return list of tests that we can run
  return _(tests)
    .map((test) => test.destination)
    .value();
};
