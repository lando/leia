'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs-extra');
const lex = require('marked').lexer;
const detectNewline = require('detect-newline');
const path = require('path');

/*
 * Helper to determine whether we can whitelist a header
 */
const validateTestHeader = (text, starters) => !_.isEmpty(_.filter(starters, (begins) => _.startsWith(text, begins)));

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
 * Quote and escape a string to use in the template.
 */
const escapeString = (text) => {
  // Escape single quotes and backslashes so they're now literal.
  return '\'' + text.replace(/(['\\])/g, '\\$1') + '\'';
};

/*
 * Helper parse a test describe
 */
const parseTestDescribe = (describe) => _.lowerCase(_.trim(_.trimStart(describe, '#')));

/*
 * Helper to parse a test command
 */
const parseTestCommand = (test) => {
  const newLine = detectNewline(test);
  // Start by removing trailing or fronting whitespace
  test = _(test.split(newLine)).map((line) => _.trim(line)).value().join(newLine);
  // Regex to help assemble multiliner
  const mergeLines = new RegExp(`\\\\${newLine}`, 'g');
  // String out comments
  const lines = _(test.replace(mergeLines, ' ').split(newLine))
    .filter((line) => !_.startsWith(line, '#'))
    .map((line) => _.trim(line))
    .value();

  // Concat and return
  return escapeString(lines.join(' && '));
};

/*
 * Helper to parse a markdown code block contents into leia tests
 */
const parseCodeBlock = (text) => {
  const newLine = detectNewline(text);
  return _.map(text.split(`${newLine}${newLine}`), (test) => ({
    command: parseTestCommand(test),
    describe: _.map(_.filter(test.split(newLine), (line) => _.startsWith(line, '#')), parseTestDescribe),
  }));
};

/*
 * Helper to parse a markdown code block into
 */
const parseCode = (data) => ({
  code: parseCodeBlock(data.text),
  file: data.file,
  type: 'code',
});

/*
 * Helper to parse markdown h1 into leia title
 */
const parseTitle = (data, {destination, outputExtension, retry, stdin}) => ({
  file: data.file,
  id: _.kebabCase(data.text),
  output: path.resolve(destination, _.kebabCase(data.text) + `.${outputExtension}`),
  retry: retry,
  run: path.relative(path.resolve(destination), path.dirname(data.file)),
  stdin: stdin ? 'inherit' : 'pipe',
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
const parseTests = (data) => _(data)
// Collapse our data into an array of section indexes
  .map((datum, index) => (datum.type === 'section') ? index : undefined)
  .filter((datum) => datum !== undefined)
// Go through the indexes and merge data(index) - data(index + 1) together
// This basically "assigns" code blocks to a given test section
  .thru((indexes) => _.map(indexes, (index, i) => ({
    tests: _.flatMap(_.slice(data, index + 1, indexes[i + 1]), (test) => test.code),
    type: data[index].test,
  })))
// Group the tests by the type
  .groupBy('type')
// Flatten and collapse the data to make it more readable, traversable, manageable
  .tap((groups) => {
    _.forEach(groups, (group, key) => {
      groups[key] = _.flatMap(group, (index) => index.tests);
    });
  })
  .value();

/**
 * Takes an array of absolute pathed markdown files and generates leia testing metadata
 *
 * @since 0.5.0
 * @param {Array} files An array of absolute paths to markdown files
 * @param {Object} [options] An array of options
 * @param {Array} [options.cleanupHeader=['Clean']] An array of words that h2 headers can start with to be flagged as cleanup commands
 * @param {String} [options.destination='.'] The directory to generate tests
 * @param {String} [options.outputExtension='func.js'] The suffix of the generate test files
 * @param {Integer} [options.retry=3] Amount of times to retry each test
 * @param {Array} [options.setupHeader=['Setup']] An array of words h2 headers can start with to be flagged as setup commands
 * @param {Array} [options.cleanupHeader=['Test']] An array of words h2 headers can start with to flagged as test commands
 * @return {Object} An object of parsed leia test metadate that you can use to generate mocha tests
 */
module.exports = (files, {
  cleanupHeader = ['Clean'],
  destination = '.',
  // @DEPRECATED in favor of destination but kept for backwards compat
  dest = '.',
  outputExtension = 'leia.js',
  retry = 3,
  setupHeader = ['Setup'],
  stdin = false,
  testHeader = ['Test'],
} = {}) =>
  _(files)
    // Map file location into parsed markdown
    .map((file) => ({lex: lex(fs.readFileSync(file, 'utf8')), file}))
    // Merge file data into every markdown element
    .flatMap((data) => _.map(data.lex, (piece) => _.merge({}, {file: data.file}, piece)))
    // Remove irrelevant elements
    .filter((datum) => (datum.type === 'heading' || datum.type === 'code'))
    // Remove irrelevant headers
    .filter((datum) => (datum.type === 'code' || (datum.type === 'heading' && datum.depth < 3)))
    // Parse into more useful metadata
    .map((datum) => {
      if (datum.type === 'heading' && datum.depth === 1) {
        return parseTitle(datum, {destination: destination || dest, outputExtension, retry, stdin});
      } else return datum;
    })
    .map((datum) => {
      if (datum.type === 'heading' && datum.depth === 2) {
        return parseSection(datum, {testHeader, setupHeader, cleanupHeader});
      } else return datum;
    })
    .map((datum) => (datum.type === 'code') ? parseCode(datum) : datum)
    // Group back by file
    .groupBy('file')
    // Combine data and organize our tests correctly
    .map((file) => _.merge({}, _.remove(file, {type: 'title'})[0], {tests: parseTests(file)}))
    // Filter out any tests that have no content
    .filter((file) => _.has(file, 'tests.test'))
    // Return
    .value();

