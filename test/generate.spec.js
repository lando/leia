/**
 * Tests for test generation.
 * @file generate.spec.js
 */

'use strict';

const chai = require('@lando/chai');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const vm = require('vm');
chai.should();

const generate = require('./../lib/generate');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-generate-'));
const normalizePath = (file) => file.split(path.sep).join('/');
const commands = [
  'printf \'%s\\n\' \'both `$INTERACTIVE` and `$NONINTERACTIVE` are set.\'',
  'printf \'%s\\n\' "${HOME}"',
  'printf \'\\033[31mred\\033[0m\\n\'',
  'printf \'%s\\n\' abc | sed -E \'s/(a)/\\1/\'',
  'printf \'%s\\n\' "$(printf \'%s\' substitution)"',
  'printf \'%s\\n\' "$HOME"',
  'printf \'%s\\n\' \'"quoted" \\\\literal\\\\\'',
  'printf \'%s\\n\' first\nprintf \'%s\\n\' second',
];
const tests = [{
  file: normalizePath(path.join(tempDir, 'mock.md')),
  id: 'mock',
  destination: path.join(tempDir, 'mock.leia.js'),
  retry: 3,
  cwd: normalizePath(tempDir),
  chaiPath: normalizePath(require.resolve('@lando/chai')),
  cltPath: normalizePath(require.resolve('command-line-test')),
  debugPath: normalizePath(require.resolve('debug')),
  stdin: 'pipe',
  text: 'Mock',
  type: 'title',
  version: 'test',
  tests: {
    test: commands.map((command, index) => {
      const script = path.join(tempDir, `mock-${index}.leia.sh`);
      return {
        args: `[${JSON.stringify(normalizePath(script))}]`,
        command,
        describe: [`mock test ${index}`],
        id: 'mock',
        number: index + 1,
        script,
        section: 'test',
        shell: 'sh',
        skip: false,
      };
    }),
  },
}];

describe('generate', () => {
  after(() => fs.removeSync(tempDir));

  it('should return a list of outputted files', () => {
    const files = generate(tests);
    files.should.be.an('Array');
    files.should.have.lengthOf(1);
  });
  it('should preserve shell command text byte-for-byte', () => {
    generate(tests);
    tests[0].tests.test.forEach((test) => {
      fs.readFileSync(test.script, 'utf8').should.equal(test.command);
    });
  });
  it('should create valid mocha tests with serialized debug commands', () => {
    generate(tests);
    const source = fs.readFileSync(tests[0].destination, 'utf8');
    (() => new vm.Script(source, {filename: tests[0].destination})).should.not.throw();
    tests[0].tests.test.forEach((test) => {
      source.should.include(`commands: ${JSON.stringify(test.command)}`);
    });
  });
});
