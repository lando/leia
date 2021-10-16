'use strict';

// Modules
const _ = require('lodash');
const glob = require('glob');

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
module.exports = (patterns, ignore = []) => _(patterns)
  .map((pattern) => glob.sync(pattern, {realpath: true, nodir: true, ignore}))
  .flatten()
  .uniq()
  .value();

