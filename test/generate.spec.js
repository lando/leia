/**
 * Tests for test generation.
 * @file generate.spec.js
 */

'use strict';

const {spawnSync} = require('child_process');
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
        args: [normalizePath(script)],
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
    source.should.include('import {createRequire} from \'node:module\';');
    source.should.include('const require = createRequire(import.meta.url);');
    source.should.include(`const chai = require(${JSON.stringify(tests[0].chaiPath)});`);
    tests[0].tests.test.forEach((test) => {
      source.should.include(`commands: ${JSON.stringify(test.command)}`);
    });
  });
  it('should preserve quote and backslash metadata in valid harnesses', () => {
    ['commonjs', 'esm'].forEach((moduleFormat) => {
      const tests = getTests(moduleFormat);
      const special = `quote'"\\backslash`;
      tests[0].tests.test = [tests[0].tests.test[0]];
      tests[0].id = `mock-${special}`;
      tests[0].cwd = `C:\\Leia's "tests"\\cwd`;
      tests[0].chaiPath = `C:\\Leia's "modules"\\chai`;
      tests[0].cltPath = `C:\\Leia's "modules"\\command-line-test`;
      tests[0].debugPath = `C:\\Leia's "modules"\\debug`;
      tests[0].stdin = 'inherit';
      tests[0].version = `v1-${special}`;
      tests[0].tests.test[0].args = [`--value=${special}`, `C:\\Leia's "scripts"\\test`];
      tests[0].tests.test[0].describe = [`should preserve ${special}`];
      tests[0].tests.test[0].id = `test-${special}`;
      tests[0].tests.test[0].number = 7;
      tests[0].tests.test[0].section = `section-${special}`;
      tests[0].tests.test[0].shell = `C:\\Leia's "shell"\\sh`;

      generate(tests);
      const source = fs.readFileSync(tests[0].destination, 'utf8');
      const syntax = spawnSync(process.execPath, ['--check', tests[0].destination], {encoding: 'utf8'});
      syntax.status.should.equal(0, syntax.stderr);
      [
        tests[0].id,
        tests[0].cwd,
        tests[0].chaiPath,
        tests[0].cltPath,
        tests[0].debugPath,
        tests[0].version,
        tests[0].tests.test[0].describe[0],
        tests[0].tests.test[0].id,
        tests[0].tests.test[0].section,
        tests[0].tests.test[0].shell,
      ].forEach((value) => source.should.include(JSON.stringify(value)));
      source.should.include(JSON.stringify(tests[0].tests.test[0].args));

      if (moduleFormat === 'commonjs') {
        const captured = {chdir: [], debug: [], descriptions: [], requires: [], spawns: []};
        const runtimeProcess = {env: {}, chdir: (cwd) => captured.chdir.push(cwd)};
        class CliTest {
          spawn(shell, args, options) {
            captured.spawns.push({shell, args, options, env: {...runtimeProcess.env}});
            return {then: (resolve) => resolve({error: null})};
          }
        }
        const suite = {
          ctx: {test: {_currentRetry: 0, skip: () => {}}},
          retries: (retry) => captured.retry = retry,
        };
        const context = {
          describe: (id, callback) => {
            captured.id = id;
            callback.call(suite);
          },
          it: (description, callback) => {
            captured.descriptions.push(description);
            callback(() => {});
          },
          process: runtimeProcess,
          require: (dependency) => {
            captured.requires.push(dependency);
            if (dependency === tests[0].chaiPath) return {should: () => {}};
            if (dependency === tests[0].cltPath) return CliTest;
            if (dependency === tests[0].debugPath) {
              return (namespace) => {
                captured.namespace = namespace;
                return (...args) => captured.debug.push(args);
              };
            }
            if (dependency === 'path') return {};
            throw new Error(`Unexpected dependency ${dependency}`);
          },
        };
        new vm.Script(source, {filename: tests[0].destination}).runInNewContext(context);

        const fromVm = (value) => JSON.parse(JSON.stringify(value));
        captured.id.should.equal(tests[0].id);
        captured.retry.should.equal(tests[0].retry);
        captured.namespace.should.equal(`leia:test:${tests[0].id}`);
        captured.requires.should.deep.equal([
          tests[0].chaiPath,
          tests[0].cltPath,
          tests[0].debugPath,
          'path',
        ]);
        captured.descriptions.should.deep.equal([tests[0].tests.test[0].describe[0]]);
        captured.chdir.should.deep.equal([tests[0].cwd]);
        captured.spawns[0].shell.should.equal(tests[0].tests.test[0].shell);
        fromVm(captured.spawns[0].args).should.deep.equal(tests[0].tests.test[0].args);
        fromVm(captured.spawns[0].options.stdio).should.deep.equal([tests[0].stdin, 'pipe', 'pipe']);
        captured.spawns[0].env.LEIA_TEST_ID.should.equal(tests[0].tests.test[0].id);
        captured.spawns[0].env.LEIA_TEST_NUMBER.should.equal(tests[0].tests.test[0].number);
        captured.spawns[0].env.LEIA_TEST_STAGE.should.equal(tests[0].tests.test[0].section);
        fromVm(captured.debug[0][3]).should.deep.equal({
          args: tests[0].tests.test[0].args,
          commands: tests[0].tests.test[0].command,
          shell: tests[0].tests.test[0].shell,
          stdin: tests[0].stdin,
        });
      }
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
    const bodyStart = `describe(${JSON.stringify('mock')}`;
    commonjsSource.slice(commonjsSource.indexOf(bodyStart)).should.equal(
      esmSource.slice(esmSource.indexOf(bodyStart)),
    );
  });
  it('should reject unsupported generated module formats', () => {
    const tests = getTests();
    tests[0].moduleFormat = 'amd';
    (() => generate(tests)).should.throw('Cannot generate unsupported module format "amd".');
  });
  it('should reject invalid retry metadata before rendering', () => {
    const tests = getTests();
    tests[0].retry = 'three';
    (() => generate(tests)).should.throw('--retry must be an integer between 0 and');
  });
  it('should reject source-form arguments instead of interpolating them', () => {
    const tests = getTests();
    tests[0].tests.test[0].args = `['${tests[0].tests.test[0].script}']`;
    (() => generate(tests)).should.throw('tests.test[0].args" must be an array of strings');
  });
});
