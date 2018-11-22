/**
 * Tests for logging system.
 * @file log.spec.js
 */

'use strict';

const _ = require('lodash');
const chai = require('chai');
const EventEmitter = require('events').EventEmitter;
chai.should();

const Log = require('./../lib/log');

describe('logger', () => {
  describe('#Log', () => {
    it('should return a Log instance with correct default options', () => {
      const log = new Log();
      log.should.be.instanceof(EventEmitter);
      log.should.have.property('exitOnError', true);
      log.transports.should.be.an('object').with.property('console');
      log.transports.console.should.be.instanceof(EventEmitter);
      log.transports.console.should.have.property('level', 'info');
      _.forEach(['error', 'warn', 'info', 'verbose', 'debug', 'silly'], level => {
        log[level].should.be.a('function');
      });
    });

    it('should return a Log instance with custom logLevelConsole', () => {
      const log = new Log({logLevelConsole: 'info'});
      log.transports.console.should.have.property('level', 'info');
    });

    it('should return a Log instance with custom integer logLevelConsole', () => {
      const logLevels = {
        '0': 'info',
        '1': 'verbose',
        '2': 'debug',
        '3': 'silly',
      };
      _.forEach(logLevels, (word, num) => {
        const log = new Log({logLevelConsole: _.toInteger(num)});
        log.transports.console.should.have.property('level', word);
      });
    });
  });
});
