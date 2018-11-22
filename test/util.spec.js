/**
 * Tests for our build scripts.
 * @file util.spec.js
 */

'use strict';

const chai = require('chai');
chai.should();

const util = require('./../lib/util');

describe('util', () => {
  describe('#bumpVersion', () => {
    it('should return version with bumped patch version by default', () => {
      util.bumpVersion('1.0.0').should.equal('1.0.1');
    });

    it('should return version with bumped specified prerelease when it is specified for prerelease type', () => {
      util.bumpVersion('1.0.0-whatevs.5', 'prerelease', 'whatevs').should.equal('1.0.0-whatevs.6');
    });

    it('should return version with bumped patch when patch is the type', () => {
      util.bumpVersion('1.0.0', 'patch').should.equal('1.0.1');
    });

    it('should return version with bumped minor when minor is the type', () => {
      util.bumpVersion('1.0.0', 'minor').should.equal('1.1.0');
    });

    it('should return version with bumped major when patch is the major', () => {
      util.bumpVersion('1.0.0', 'major').should.equal('2.0.0');
    });

    it('should return version with bumped patch when type is something else', () => {
      util.bumpVersion('1.0.0', 'jacksonbrowne').should.equal('1.0.1');
    });
  });
});
