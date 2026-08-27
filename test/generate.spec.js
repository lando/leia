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
const getTests = (moduleFormat = 'commonjs') => [{
  file: normalizePath(path.join(tempDir, 'mock.md')),
  id: 'mock',
  destination: path.join(tempDir, `mock.leia.${moduleFormat === 'esm' ? 'mjs' : 'cjs'}`),
  moduleFormat,
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
      const script = path.join(tempDir, `mock-${moduleFormat}-${index}.leia.sh`);
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
    const tests = getTests();
    const files = generate(tests);
    files.should.be.an('Array');
    files.should.have.lengthOf(1);
  });
  it('should preserve shell command text byte-for-byte', () => {
    ['commonjs', 'esm'].forEach((moduleFormat) => {
      const tests = getTests(moduleFormat);
      generate(tests);
      tests[0].tests.test.forEach((test) => {
        fs.readFileSync(test.script, 'utf8').should.equal(test.command);
      });
    });
  });
  it('should create valid CommonJS mocha tests with serialized debug commands', () => {
    const tests = getTests();
    generate(tests);
    const source = fs.readFileSync(tests[0].destination, 'utf8');
    (() => new vm.Script(source, {filename: tests[0].destination})).should.not.throw();
    tests[0].tests.test.forEach((test) => {
      source.should.include(`commands: ${JSON.stringify(test.command)}`);
    });
  });
  it('should create valid ESM mocha tests using CommonJS dependencies', () => {
    const tests = getTests('esm');
    generate(tests);
    const source = fs.readFileSync(tests[0].destination, 'utf8');
    source.should.include("import {createRequire} from 'node:module';");
    source.should.include('const require = createRequire(import.meta.url);');
    source.should.include(`const chai = require('${tests[0].chaiPath}');`);
    tests[0].tests.test.forEach((test) => {
      source.should.include(`commands: ${JSON.stringify(test.command)}`);
    });
  });
  it('should generate equivalent scenario bodies for CommonJS and ESM', () => {
    const commonjsTests = getTests();
    const esmTests = getTests();
    esmTests[0].destination = path.join(tempDir, 'equivalent.leia.mjs');
    esmTests[0].moduleFormat = 'esm';
    generate(commonjsTests);
    generate(esmTests);

    const commonjsSource = fs.readFileSync(commonjsTests[0].destination, 'utf8');
    const esmSource = fs.readFileSync(esmTests[0].destination, 'utf8');
    const bodyStart = "describe('mock'";
    commonjsSource.slice(commonjsSource.indexOf(bodyStart)).should.equal(
      esmSource.slice(esmSource.indexOf(bodyStart)),
    );
  });
  it('should reject unsupported generated module formats', () => {
    const tests = getTests();
    tests[0].moduleFormat = 'amd';
    (() => generate(tests)).should.throw('Cannot generate unsupported module format "amd".');
  });
});
