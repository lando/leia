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
  find(patterns, ignore) {
    return require('./find')(patterns, ignore);
  }

  /**
   * Takes an array of parsed leia test metadata and generates mocha cli tests
   *
   * @since 0.5.0
   * @param {Array} tests An array of parsed leia test metadata
   * @param {Object} [options] Options to pass to the dot template engine
   * @param {Boolean} [options.strip=false] Strips things
   * @return {Array} An array of unique absolute filepaths
   */
  generate(tests, options) {
    return require('./generate')(tests, options);
  }

  /**
   * Resolves a requested generated harness module format.
   *
   * @param {String} [moduleFormat=auto] Requested auto, commonjs, or esm format.
   * @param {String} [cwd=process.cwd()] Initial invocation working directory used for auto detection.
   * @return {String} The resolved commonjs or esm format.
   * @throws {Error} When the format is unsupported or the nearest package.json cannot be read or parsed.
   */
  resolveModuleFormat(moduleFormat, cwd) {
    return require('./module-format')(moduleFormat, cwd);
  }

  /**
   * Takes an array of absolute pathed markdown files and generates leia testing metadata
   *
   * @since 0.5.0
   * @param {Array} files An array of absolute paths to markdown files
   * @param {Object} [options] An array of options
   * @param {Array} [options.cleanupHeader=['Clean']] An array of words that h2 headers can start with to be flagged as cleanup commands
   * @param {Integer} [options.retry=3] Non-negative safe integer amount of times to retry each test
   * @param {Array} [options.setupHeader=['Setup']] An array of words h2 headers can start with to be flagged as setup commands
   * @param {String} [options.shell=autodetected] A string containing the shell to run tests with
   * @param {Boolean} [options.stdin=false] A boolean to attach stdin or not
   * @param {Array} [options.testHeader=['Test']] An array of words h2 headers can start with to flagged as test commands
   * @param {String} [options.moduleFormat=auto] Generated harness module format: auto, commonjs, or esm
   * @return {Object} An object of parsed leia test metadate that you can use to generate mocha tests
   * @throws {Error} When retry is invalid or module format detection cannot read or parse the nearest package.json
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
   * @param {Integer} [options.timeout=1800] Non-negative whole seconds, no greater than 2147483
   * @return {Object} A test loaded mocha instance
   * @throws {Error} When timeout is invalid, tests are empty, or tests include an ESM harness
   */
  run(tests, options) {
    return require('./run')(tests, options);
  }

  /**
   * Loads CommonJS or ESM harnesses asynchronously and returns a ready Mocha instance.
   *
   * @param {Array} tests An array of absolute paths to generated Leia test files
   * @param {Object} [options] An array of Mocha options
   * @param {Integer} [options.timeout=1800] Non-negative whole seconds, no greater than 2147483
   * @return {Promise<Object>} A promise for a loaded Mocha instance
   * @throws {Error} When timeout is invalid, tests are empty, or a harness cannot be loaded
   */
  runAsync(tests, options) {
    return require('./run').async(tests, options);
  }
};
