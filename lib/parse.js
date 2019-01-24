'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs-extra');
const lex = require('marked').lexer;
const os = require('os');
const path = require('path');

/*
 * Helper to determine whether we can whitelist a header
 */
const validateTestHeader = (text, starters) => !_.isEmpty(_.filter(starters, begins => _.startsWith(text, begins)));

/*
 * Helper to assign testing headers to setup|test|cleanup roles
 */
const getTestType = (datum, {testHeader, setupHeader, cleanupHeader}) => {
  if (validateTestHeader(datum.text, setupHeader)) return 'setup';
  else if (validateTestHeader(datum.text, testHeader)) return 'test';
  else if (validateTestHeader(datum.text, cleanupHeader)) return 'cleanup';
  else return 'nope';
};

/*
 * Helper parse a test describe
 */
const parseTestDescribe = describe => _.lowerCase(_.trim(_.trimStart(describe, '#')));

/*
 * Helper to parse a markdown code block contents into leia tests
 */
const parseCodeBlock = text => _.map(text.split(`${os.EOL}${os.EOL}`), test => ({
  command: _.join(_.filter(test.split(os.EOL), line => !_.startsWith(line, '#')), ' && '),
  describe: _.map(_.filter(test.split(os.EOL), line => _.startsWith(line, '#')), parseTestDescribe),
}));

/*
 * Helper to parse a markdown code block into
 */
const parseCode = data => ({
  code: parseCodeBlock(data.text),
  file: data.file,
  type: 'code',
});

/*
 * Helper to parse markdown h1 into leia title
 */
const parseTitle = (data, {dest, outputExtension, retry}) => ({
  file: data.file,
  id: _.kebabCase(data.text),
  output: path.resolve(dest, _.kebabCase(data.text) + `.${outputExtension}`),
  retry: retry,
  run: path.relative(path.resolve(dest), path.dirname(data.file)),
  text: data.text,
  type: 'title',
  version: require(path.resolve(__dirname, '..', 'package.json')).version,
});

/*
 * Helper to parse markdown h2 into leia test section
 */
const parseSection = (data, options) => ({
  file: data.file,
  text: data.text,
  test: getTestType(data, options),
  type: 'section',
});

/*
 * Helper to organize our tests
 * NOTE: this is complicated
 */
const parseTests = data => _(data)
  // Collapse our data into an array of section indexes
  .map((datum, index) => (datum.type === 'section') ? index : undefined)
  .filter(datum => datum !== undefined)
  // Go through the indexes and merge data(index) - data(index + 1) together
  // This basically "assigns" code blocks to a given test section
  .thru(indexes => _.map(indexes, (index, i) => ({
    tests: _.flatMap(_.slice(data, index + 1, indexes[i + 1]), test => test.code),
    type: data[index].test,
  })))
  // Group the tests by the type
  .groupBy('type')
  // Flatten and collapse the data to make it more readable, traversable, manageable
  .tap(groups => {
    _.forEach(groups, (group, key) => {
      groups[key] = _.flatMap(group, index => index.tests);
    });
  })
  .value();

/**
 * Takes an array of absolute pathed markdown files and generates leia testing metadata
 *
 * @since 0.1.0
 * @param {Array} files An array of absolute paths to markdown files
 * @param {Object} [options] An array of options
 * @param {Array} [options.cleanupHeader=['Clean']] An array of words that h2 headers can start with to be flagged as cleanup commands
 * @param {String} [options.dest='.'] The directory to generate tests
 * @param {String} [options.outputExtension='func.js'] The suffix of the generate test files
 * @param {Integer} [options.retry=3] Amount of times to retry each test
 * @param {Array} [options.setupHeader=['Setup']] An array of words h2 headers can start with to be flagged as setup commands
 * @param {Array} [options.cleanupHeader=['Test']] An array of words h2 headers can start with to flagged as test commands
 * @return {Object} An object of parsed leia test metadate that you can use to generate mocha tests
 */
module.exports = (files, {
  cleanupHeader = ['Clean'],
  dest = '.',
  outputExtension = 'func.js',
  retry = 3,
  setupHeader = ['Setup'],
  testHeader = ['Test'],
} = {}) =>
  _(files)
  // Map file location into parsed markdown
  .map(file => ({lex: lex(fs.readFileSync(file, 'utf8')), file}))
  // Merge file data into every markdown element
  .flatMap(data => _.map(data.lex, piece => _.merge({}, {file: data.file}, piece)))
  // Remove irrelevant elements
  .filter(datum => (datum.type === 'heading' || datum.type === 'code'))
  // Remove irrelevant headers
  .filter(datum => (datum.type === 'code' || (datum.type === 'heading' && datum.depth < 3)))
  // Parse into more useful metadata
  .map(datum => (datum.type === 'heading' && datum.depth === 1) ? parseTitle(datum, {dest, outputExtension, retry}) : datum)
  .map(datum => (datum.type === 'heading' && datum.depth === 2) ? parseSection(datum, {testHeader, setupHeader, cleanupHeader}) : datum)
  .map(datum => (datum.type === 'code') ? parseCode(datum) : datum)
  // Group back by file
  .groupBy('file')
  // Combine data and organize our tests correctly
  .map(file => _.merge({}, _.remove(file, {type: 'title'})[0], {tests: parseTests(file)}))
  // Filter out any tests that have no content
  .filter(file => _.has(file, 'tests.test'))
  // Return
  .value();

