/*
 * This file was automatically generated, editing it manually would be foolish
 *
 * See https://github.com/lando/leia for more
 * information on how all this magic works
 *
 * id: special-characters-example
 * runs-from: ../examples
 */

// Set some helpful envvars so we know these are leia tezts
process.env.LEIA_PARSER_RUNNING = 'true';
process.env.LEIA_PARSER_VERSION = '0.4.0';
process.env.LEIA_PARSER_ID = 'special-characters-example';
process.env.LEIA_PARSER_RETRY = 3;

// We need these deps to run our tezts
const chai = require('chai');
const CliTest = require('command-line-test');
const path = require('path');
chai.should();

/* eslint-disable max-len */

describe('special-characters-example', function() {
  this.retries(3);

  // These tests are the main event
  // @todo: It would be nice to eventually get these into mocha after hooks
  // so they run after every test
  it('should process special pec a 1 characters', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo \'"[]\\/@%+=:,.-\''], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should process quoted characters', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo "\'\\""'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should process special quoted characters', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo "\\t\\n\'"'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should escape backslash character', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo lando psql -U postgres database -c "\\dt"'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should process literal backslash characters', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo \'\\\\literal\\\\\''], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should process quoted backslash', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo "\\dt"'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });
});
