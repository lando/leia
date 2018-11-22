'use strict';

const semver = require('semver');

/*
 * Bumps a version by release type
 */
exports.bumpVersion = (version, type = 'patch', prerelease = 'rc') => {
  switch (type) {
    case 'prerelease':
      return semver.inc(version, 'prerelease', prerelease);
    case 'patch':
      return semver.inc(version, 'patch');
    case 'minor':
      return semver.inc(version, 'minor');
    case 'major':
      return semver.inc(version, 'major');
    default:
      return semver.inc(version, 'patch');
  }
};

