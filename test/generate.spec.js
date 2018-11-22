/**
 * Tests for test generation.
 * @file generate.spec.js
 */

'use strict';

const chai = require('chai');
chai.should();

const generate = require('./../lib/generate');
const tests = [{
  file: '/tmp/mock.md',
  id: 'mock',
  output: '/tmp/mock.func.js',
  retry: 3,
  run: '.',
  text: 'Mock',
  type: 'title',
  tests: {
    test: [{
      command: 'true',
      describe: 'mock test',
    }],
  },
}];

describe('generate', () => {
  it('should return a list of outputted files', () => {
    const files = generate(tests);
    files.should.be.an('Array');
    files.should.have.lengthOf(1);
  });
  it('should create test files');
  it('should create valid mocha tests');
});
