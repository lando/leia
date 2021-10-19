'use strict';

module.exports = class Leia {
  constructor() {};

  /**
   * Takes an array of glob patterns and returns a unique list of all the matching files
   *
   * @since 0.5.0
   * @param {Array} patterns An array of GLOB patterns
   * @param {Array} ignore An array of GLOB patterns
   * @return {Array} An array of unique absolute filepaths
   * @example
   * const find = require(./find');
   * const files = find(['./examples/*.md']);
   */
  find(patterns, ignore = []) {
    return require('./find')(patterns, ignore);
  }

  /**
   * Takes an array of parsed leia test metadata and generates mocha cli tests
   *
   * @since 0.5.0
   * @param {Array} tests An array of parsed leia test metadata
   * @param {Object} [opts] Options to pass to the dot template engine
   * @param {Boolean} [opts.strip=false] Strips things
   * @return {Array} An array of unique absolute filepaths
   */
  generate(tests, opts = {strip: false}) {
    return require('./generate')(tests, opts);
  }

  /**
   * Takes an array of absolute pathed markdown files and generates leia testing metadata
   *
   * @since 0.5.0
   * @param {Array} files An array of absolute paths to markdown files
   * @param {Object} [options] An array of options
   * @param {Array} [options.cleanupHeader=['Clean']] An array of words that h2 headers can start with to be flagged as cleanup commands
   * @param {Integer} [options.retry=3] Amount of times to retry each test
   * @param {Array} [options.setupHeader=['Setup']] An array of words h2 headers can start with to be flagged as setup commands
   * @param {Boolean} [options.stdin=false] A boolean to attach stdin or not
   * @param {Array} [options.testHeader=['Test']] An array of words h2 headers can start with to flagged as test commands
   * @return {Object} An object of parsed leia test metadate that you can use to generate mocha tests
   */
  parse(files, options) {
    return require('./parse')(files, options);
  }

  /**
   * Runs tests
   *
   * @since 0.5.0
   * @param {Array} tests An array of absolute paths to generated leia test files
   * @param {Object} [options] An array of Mocha options
   * @return {Object} A test loaded mocha instance
   */
  run(tests, options) {
    return require('./run')(tests, options);
  }
};
