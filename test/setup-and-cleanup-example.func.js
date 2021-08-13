/*
 * This file was automatically generated, editing it manually would be foolish
 *
 * See https://github.com/lando/leia for more
 * information on how all this magic works
 *
 * id: setup-and-cleanup-example
 * runs-from: ../examples
 */

// Set some helpful envvars so we know these are leia tezts
process.env.LEIA_PARSER_RUNNING = 'true';
process.env.LEIA_PARSER_VERSION = '0.4.0';
process.env.LEIA_PARSER_ID = 'setup-and-cleanup-example';
process.env.LEIA_PARSER_RETRY = 3;

// We need these deps to run our tezts
const chai = require('chai');
const CliTest = require('command-line-test');
const path = require('path');
chai.should();

/* eslint-disable max-len */

describe('setup-and-cleanup-example', function() {
  this.retries(3);

  // These are tests we need to run to get the app into a state to test
  // @todo: It would be nice to eventually get these into mocha before hooks
  // so they run before every test
  it('create a file we can grep for a word', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo "the word is bubba" > test.txt'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  // These tests are the main event
  // @todo: It would be nice to eventually get these into mocha after hooks
  // so they run after every test
  it('should return the correct word', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'cat test.txt | grep "bubba"'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  // These are tests we need to run to get the app into a state to test
  // @todo: It would be nice to eventually get these into mocha before hooks
  // so they run before every test
  it('destroy our test file', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'rm -f test.txt'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });
});
