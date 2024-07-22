'use strict';

// Modules
const _ = require('lodash');
const debug = require('debug')('leia:parse');
const detectNewline = require('detect-newline');
const fs = require('fs-extra');
const getShell = require('./shell');
const hash = require('object-hash');
const lex = require('marked').lexer;
const os = require('os');
const path = require('path');

/*
 * Helper to determine whether we can whitelist a header
 */
const validateTestHeader = (text, starters) => !_.isEmpty(_.filter(starters, (begins) => _.startsWith(text, begins)));

/*
 * Backtrack from this projects node_modules backwards until we find the dep we are looking for
 */
const findClosestModule = (dep, base = path.resolve(__dirname, '..')) => {
  return _(_.range(base.split(path.sep).length - 1))
    .map((end) => _.dropRight(base.split(path.sep), end).join(path.sep))
    .map((dir) => path.join(dir, 'node_modules', dep))
    .thru((paths) => _.find(paths, (path) => fs.existsSync(path)))
    .value();
};

/*
 * Helper to assign testing headers to setup|test|cleanup roles
 */
const getTestType = (datum, {testHeader, setupHeader, cleanupHeader}) => {
  if (validateTestHeader(datum.text, setupHeader)) return 'setup';
  else if (validateTestHeader(datum.text, testHeader)) return 'test';
  else if (validateTestHeader(datum.text, cleanupHeader)) return 'cleanup';
  else return 'invalid';
};

/*
 * Helper parse a test describe
 */
const parseTestDescribe = (describe) => _.lowerCase(_.trim(_.trimStart(describe, '#')));

/*
 * Helper to parse a test command
 */
const parseTestCommand = (test, shell) => {
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

  // for powershell we need to prepend the error condition stuff
  if (shell === 'pwsh' || shell === 'powershell') lines.unshift('$ErrorActionPreference = "Stop"');

  // Concat and return
  return lines.join(os.EOL);
};

/*
 * Helper to parse a markdown code block contents into leia tests
 */
const parseCodeBlock = ({text, file, shell}) => {
  const newLine = detectNewline(text);
  return _.map(text.split(`${newLine}${newLine}`), (test) => {
    const scriptDir = path.join(os.tmpdir(), 'leia', hash(file));
    const scriptPath = path.join(scriptDir, `${hash(test)}${shell.extension}`).split(path.sep).join('/');
    const scriptArgs = `[${shell.args.map((arg) => `'${arg}'`).join(', ')}]`;
    return {
      args: scriptArgs.replace('{0}', scriptPath),
      shell: shell.binary.split(path.sep).join('/'),
      command: parseTestCommand(test, shell.name),
      skip: parseTestCommand(test, shell.name) === 'skip',
      script: scriptPath,
      describe: _.map(_.filter(test.split(newLine), (line) => _.startsWith(line, '#')), parseTestDescribe),
    };
  });
};

/*
 * Helper to parse a markdown code block into
 */
const parseCode = (data) => ({
  code: parseCodeBlock(data),
  file: data.file,
  type: 'code',
});

/*
 * Helper to parse markdown h1 into leia title
 */
const parseTitle = (data, {retry, stdin}) => ({
  file: data.file,
  id: _.kebabCase(data.text),
  chaiPath: findClosestModule('@lando/chai').split(path.sep).join('/'),
  cltPath: findClosestModule('command-line-test').split(path.sep).join('/'),
  debugPath: findClosestModule('debug').split(path.sep).join('/'),
  destination: path.resolve(os.tmpdir(), 'leia', hash(data.file), `${_.kebabCase(data.text)}.leia.js`),
  retry,
  cwd: path.dirname(path.resolve(data.file)).split(path.sep).join('/'),
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
    id: path.basename(data[index].file, '.md'),
    tests: _.flatMap(_.slice(data, index + 1, indexes[i + 1]), (test) => test.code),
    type: data[index].test,
  })))
  // Group the tests by the type
  .groupBy('type')
  // Flatten and collapse the data to make it more readable, traversable, manageable
  .tap((groups) => {
    _.forEach(groups, (group, key) => {
      groups[key] = _.flatMap(group, (index) => index.tests.map((test, index) => Object.assign(test, {
        id: group[0].id,
        number: index + 1,
        section: key,
      })));
    });
  })
  .value();

module.exports = (files, {
  cleanupHeader = ['Clean'],
  retry = 3,
  setupHeader = ['Setup'],
  shell = undefined,
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
        const title = parseTitle(datum, {retry, stdin});
        debug('found test file candidate %o with title "%o"', title.text, title.file);
        return title;
      } else return datum;
    })
    .map((datum) => {
      if (datum.type === 'heading' && datum.depth === 2) {
        const section = parseSection(datum, {testHeader, setupHeader, cleanupHeader});
        debug('found %o testing section candidate "%o" in %o', section.test, section.text, section.file);
        return section;
      } else return datum;
    })
    .map((datum) => {
      if (datum.type === 'code') {
        const codeblock = parseCode(_.assign(datum, {shell: getShell(shell)}));
        _.forEach(codeblock.code, (code) => {
          if (!_.isEmpty(code.describe)) {
            debug('found test candidate "%o" in %o', _.first(code.describe), codeblock.file);
          }
        });
        return codeblock;
      } else return datum;
    })
    // Group back by file
    .groupBy('file')
    // Combine data and organize our tests correctly
    .map((file) => _.merge({}, _.remove(file, {type: 'title'})[0], {tests: parseTests(file)}))
    // Filter out any tests that have no content
    .filter((file) => _.has(file, 'tests.test'))
    // Log
    .map((file) => {
      // Get some stats on the tests
      const stats = _(file.tests)
        .toPairs()
        .map((pair) => ([pair[0], _.size(pair[1])]))
        .fromPairs()
        .value();
      debug('parsed %o and found these tests: %o', file.file, stats);
      return file;
    })
    // Return
    .value();

