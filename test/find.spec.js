/**
 * Tests for our build scripts.
 * @file util.spec.js
 */

'use strict';

const chai = require('chai');
const filesystem = require('mock-fs');
chai.should();

const find = require('./../lib/find');

describe('find', () => {
  beforeEach(() => {
    filesystem({
      '/some/source/dir': {
        'test1.md': 'stuff',
        'test2.md': 'stuff',
      },
      '/some/other/source/dir': {
        'test1.md': 'stuff',
        'test2.md': 'stuff',
        'test3.md': 'stuff',
      },
    });
  });

  it('should return an array of files', () => {
    const files = find(['/some/source/dir/**.md']);
    files.should.be.an('Array');
    files.should.have.lengthOf(2);
  });
  it('should return an unique array of files', () => {
    const files = find(['/some/source/dir/**.md', '/some/source/dir/**.md']);
    files.should.be.an('Array');
    files.should.have.lengthOf(2);
  });
  it('should return an empty array if no matches', () => {
    const files = find(['/not/the/source/we/are/looking/for/**.md']);
    files.should.be.an('Array');
    files.should.have.lengthOf(0);
  });
  it('should return absolute paths');
  it('should not return directories');
  it('should return a flattened array');

  afterEach(() => {
    filesystem.restore();
  });
});
