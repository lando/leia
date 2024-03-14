/**
 * Tests for test generation.
 * @file generate.spec.js
 */

'use strict';

const chai = require('@lando/chai');
const os = require('os');
chai.should();

const generate = require('./../lib/generate');
const tests = [{
  file: `${os.tmpdir()}/mock.md`,
  id: 'mock',
  destination: `${os.tmpdir()}/mock.leia.js`,
  retry: 3,
  cwd: '.',
  text: 'Mock',
  type: 'title',
  tests: {
    test: [{
      command: 'true',
      describe: 'mock test',
      script: `${os.tmpdir()}/mock.leia.sh`,
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
