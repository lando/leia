/*
 * This file was automatically generated, editing it manually would be foolish
 *
 * See https://github.com/lando/leia for more
 * information on how all this magic works
 *
 * id: basic-example
 * runs-from: ../examples
 */

// Set some helpful envvars so we know these are leia tezts
process.env.LEIA_PARSER_RUNNING = 'true';
process.env.LEIA_PARSER_VERSION = '0.3.4';
process.env.LEIA_PARSER_ID = 'basic-example';
process.env.LEIA_PARSER_RETRY = 3;

// We need these deps to run our tezts
const chai = require('chai');
const CliTest = require('command-line-test');
const path = require('path');
chai.should();

/* eslint-disable max-len */

describe('basic-example', function() {
  this.retries(3);

  // These tests are the main event
  // @todo: It would be nice to eventually get these into mocha after hooks
  // so they run after every test
  it('should return true', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'true'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should echo some stuff', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'echo "some stuff"'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should return status code 1', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'cat filedoesnotexist || echo $? | grep 1'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should concatenate three commands together', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'export TEST=thing && env | grep TEST && unset TEST'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should not concatenate if escape is used', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'export TEST=thing  TEST2=stuff  TEST3=morestuff && env | grep TEST && env | grep TEST2 && env | grep TEST3 && unset TEST && unset TEST2 && unset TEST3'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should also run this', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'true'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });

  it('should also also run this', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.spawn('/bin/sh', ['-c', 'true'], {stdio: ['pipe', 'pipe', 'pipe']}).then(res => {
      if (res.error === null) {
        done();
      } else {
        const error = [`CODE: ${res.error.code}`, `STDOUT: ${res.stdout}`, `STDERR: ${res.stderr}`].join('\n');
        done(new Error(error));
      }
    });
  });
});
