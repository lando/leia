/**
 * Tests for leia system.
 * @file leia.spec.js
 */

'use strict';

// Setup chai.
const chai = require('chai');
chai.should();

const Leia = require('./../lib/leia');

// This is the file we are testing
describe('leia', () => {
  describe('#Leia', () => {
    it('should return a Leia instance with correct default options', () => {
      const leia = new Leia();
      leia.should.be.an('object');
    });
  });
});
