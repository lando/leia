/**
 * Tests for the Leia CLI contract.
 * @file cli.spec.js
 */

'use strict';

const chai = require('@lando/chai');

const LeiaCommand = require('../cli/default');

chai.should();

describe('cli/default', () => {
  it('should parse retry and timeout as non-negative integers', () => {
    LeiaCommand.flags.retry.parse('0').should.equal(0);
    LeiaCommand.flags.retry.parse('4').should.equal(4);
    LeiaCommand.flags.retry.parse('9007199254740991').should.equal(Number.MAX_SAFE_INTEGER);
    LeiaCommand.flags.timeout.parse('0').should.equal(0);
    LeiaCommand.flags.timeout.parse('1800').should.equal(1800);
  });

  it('should reject invalid retry values with an actionable error', () => {
    ['nope', '-1', '1.5', '1retry', '9007199254740992'].forEach((retry) => {
      (() => LeiaCommand.flags.retry.parse(retry)).should.throw(
        '--retry must be an integer between 0 and',
      );
    });
  });

  it('should reject invalid timeout values with an actionable error', () => {
    ['nope', '-1', '1.5', '5seconds', '2147484'].forEach((timeout) => {
      (() => LeiaCommand.flags.timeout.parse(timeout)).should.throw(
        '--timeout must be an integer between 0 and 2147483',
      );
    });
  });
});
