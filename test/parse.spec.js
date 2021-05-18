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
    tests[0].should.have.all.keys('file', 'id', 'output', 'retry', 'run', 'stdin', 'text', 'type', 'tests', 'version');
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
  it('should escape special characters', () => {
    const tests = parse([path.resolve(__dirname, '..', 'examples', 'special-characters-example.md')]);
    tests[0].tests.test.should.be.an('Array').and.not.be.empty;
    // Lodash's lowerCase should strip out special characters.
    tests[0].tests.test[0].describe[0].should.equal('should process special pec a 1 characters');
    tests[0].tests.test[0].command.should.equal(`'echo \\'"[]\\\\/@%+=:,.-\\''`);
    tests[0].tests.test[1].command.should.equal(`'echo "\\'\\\\""'`);
    tests[0].tests.test[2].command.should.equal(`'echo "\\\\t\\\\n\\'"'`);
    tests[0].tests.test[3].command.should.equal(`'echo lando psql -U postgres database -c "\\\\dt"'`);
    tests[0].tests.test[4].command.should.equal(`'echo \\'\\\\\\\\literal\\\\\\\\\\''`);
    tests[0].tests.test[5].command.should.equal(`'echo "\\\\dt"'`);
  });
  it('should return tests as objects with description and command');
  it('should concatenate multiline test commands with a &');
  it('should be able to combine tests from multiple code blocks under one section');
  it('should be able to combine tests from multiple setup|test|cleanup sections');
});
