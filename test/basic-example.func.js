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
process.env.LEIA_PARSER_VERSION = '0.3.3';
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
    cli.exec('true').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });

  it('should echo some stuff', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.exec('echo "some stuff"').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });

  it('should return status code 1', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.exec('cat filedoesnotexist || echo $? | grep 1').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });

  it('should concatenate three commands together', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.exec('export TEST=thing && env | grep TEST && unset TEST').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });

  it('should also run this', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.exec('true').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });

  it('should also also run this', done => {
    process.chdir(path.resolve(__dirname, '../examples'));
    const cli = new CliTest();
    cli.exec('true').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });
});
