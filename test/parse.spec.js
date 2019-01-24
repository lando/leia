/**
 * Tests for our build scripts.
 * @file parse.spec.js
 */

'use strict';

const chai = require('chai');
const path = require('path');
chai.should();

const parse = require('./../lib/parse');

describe('parse', () => {
  it('should return leia testing metadata with the default keys', () => {
    const tests = parse([path.resolve(__dirname, '..', 'examples', 'basic-example.md')]);
    tests[0].should.have.all.keys('file', 'id', 'output', 'retry', 'run', 'text', 'type', 'tests', 'version');
  });
  it('should organize tests into setup|test|cleanup buckets if applicable', () => {
    const tests = parse([path.resolve(__dirname, '..', 'examples', 'setup-cleanup-example.md')]);
    tests[0].tests.setup.should.be.an('Array').and.not.be.empty;
    tests[0].tests.test.should.be.an('Array').and.not.be.empty;
    tests[0].tests.cleanup.should.be.an('Array').and.not.be.empty;
    const tests2 = parse([path.resolve(__dirname, '..', 'examples', 'basic-example.md')]);
    tests2[0].tests.should.not.have.all.keys('setup', 'cleanup');
    tests2[0].tests.should.have.all.keys('test', 'nope');
  });
  it('should return tests as objects with description and command');
  it('should concatenate multiline test commands with a &');
  it('should be able to combine tests from multiple code blocks under one section');
  it('should be able to combine tests from multiple setup|test|cleanup sections');
});
