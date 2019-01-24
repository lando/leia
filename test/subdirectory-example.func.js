/*
 * This file was automatically generated, editing it manually would be foolish
 *
 * See https://github.com/lando/leia for more
 * information on how all this magic works
 *
 * id: subdirectory-example
 * runs-from: ../examples/subdirectory-example
 */

// Set some helpful envvars so we know these are leia tezts
process.env.LEIA_PARSER_RUNNING = 'true';
process.env.LEIA_PARSER_VERSION = '0.3.3';
process.env.LEIA_PARSER_ID = 'subdirectory-example';
process.env.LEIA_PARSER_RETRY = 3;

// We need these deps to run our tezts
const chai = require('chai');
const CliTest = require('command-line-test');
const path = require('path');
chai.should();

/* eslint-disable max-len */

describe('subdirectory-example', function() {
  this.retries(3);

  // These tests are the main event
  // @todo: It would be nice to eventually get these into mocha after hooks
  // so they run after every test
  it('analyze the contents of our first file', done => {
    process.chdir(path.resolve(__dirname, '../examples/subdirectory-example'));
    const cli = new CliTest();
    cli.exec('cat text1.txt | grep test').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });

  it('analze the contents of our second file', done => {
    process.chdir(path.resolve(__dirname, '../examples/subdirectory-example'));
    const cli = new CliTest();
    cli.exec('cat text2.txt | grep test2').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });
});
