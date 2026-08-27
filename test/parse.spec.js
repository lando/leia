/**
 * Tests for our build scripts.
 * @file parse.spec.js
 */

'use strict';

const os = require('os');
const path = require('path');

const chai = require('@lando/chai');

const parse = require('./../lib/parse');

chai.should();

describe('parse', () => {
  it('should return leia testing metadata with the default keys', () => {
    const tests = parse([path.resolve(__dirname, '..', 'examples', 'basic-example.md')]);
    const keys = [
      'cwd',
      'chaiPath',
      'cltPath',
      'debugPath',
      'destination',
      'file',
      'id',
      'moduleFormat',
      'retry',
      'stdin',
      'text',
      'type',
      'tests',
      'version',
    ];
    tests[0].should.have.all.keys(...keys);
    tests[0].moduleFormat.should.equal('commonjs');
    tests[0].destination.should.match(/\.leia\.cjs$/);
  });
  it('should generate ESM destination metadata when requested', () => {
    const tests = parse(
      [path.resolve(__dirname, '..', 'examples', 'basic-example.md')],
      {moduleFormat: 'esm'},
    );
    tests[0].moduleFormat.should.equal('esm');
    tests[0].destination.should.match(/\.leia\.mjs$/);
  });
  it('should organize tests into setup|test|cleanup buckets if applicable', () => {
    const tests = parse([path.resolve(__dirname, '..', 'examples', 'setup-cleanup-example.md')]);
    tests[0].tests.setup.should.be.an('Array').and.not.be.empty;
    tests[0].tests.test.should.be.an('Array').and.not.be.empty;
    tests[0].tests.cleanup.should.be.an('Array').and.not.be.empty;
    const tests2 = parse([path.resolve(__dirname, '..', 'examples', 'basic-example.md')]);
    tests2[0].tests.should.not.have.all.keys('setup', 'cleanup');
    tests2[0].tests.should.have.all.keys('test', 'invalid');
  });
  it('should return tests as objects with description and command', () => {
    const tests = parse([path.resolve(__dirname, '..', 'examples', 'basic-example.md')]);
    const test = tests[0].tests.test[0];

    test.should.have.all.keys(
      'args',
      'command',
      'describe',
      'id',
      'number',
      'script',
      'section',
      'shell',
      'skip',
    );
    test.describe.should.deep.equal(['should return true']);
    test.command.should.equal('true');
  });
  it('should fold multiline continuations and preserve separate commands', () => {
    const tests = parse([path.resolve(__dirname, '..', 'examples', 'basic-example.md')]);
    const test = tests[0].tests.test.find(({describe}) => (
      describe.includes('should not concatenate if escape is used')
    ));

    test.command.should.equal([
      'export TEST=thing  TEST2=stuff  TEST3=morestuff',
      'env | grep TEST',
      'env | grep TEST2',
      'env | grep TEST3',
      'unset TEST',
      'unset TEST2',
      'unset TEST3',
    ].join(os.EOL));
  });
  it('should combine tests from multiple code blocks under one section', () => {
    const tests = parse([path.resolve(__dirname, 'parse-code-blocks.md')]);

    tests[0].tests.test.map((test) => test.describe[0]).should.deep.equal([
      'should parse the first code block',
      'should parse the second code block',
    ]);
    tests[0].tests.test.map((test) => test.command).should.deep.equal([
      'echo first',
      'echo second',
    ]);
  });
  it('should combine tests from repeated setup, test, and cleanup sections', () => {
    const tests = parse([path.resolve(__dirname, 'parse-sections.md')]);

    tests[0].tests.setup.map((test) => test.describe[0]).should.deep.equal([
      'should run first setup',
      'should run second setup',
    ]);
    tests[0].tests.test.map((test) => test.describe[0]).should.deep.equal([
      'should run first test',
      'should run second test',
    ]);
    tests[0].tests.cleanup.map((test) => test.describe[0]).should.deep.equal([
      'should run first cleanup',
      'should run second cleanup',
    ]);
    tests[0].tests.setup.map((test) => test.number).should.deep.equal([1, 2]);
    tests[0].tests.test.map((test) => test.number).should.deep.equal([1, 2]);
    tests[0].tests.cleanup.map((test) => test.number).should.deep.equal([1, 2]);
  });
});
