'use strict';

// Modules
const _ = require('lodash');
const debug = require('debug')('leia:find');
const glob = require('glob');

module.exports = (patterns, ignore = []) => {
  debug('scanning patterns %o and ignoring %o', patterns, ignore);
  return _(patterns)
    .map((pattern) => glob.sync(pattern, {realpath: true, nodir: true, ignore}))
    .flatten()
    .uniq()
    .value();
};

