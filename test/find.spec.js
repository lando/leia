/**
 * Tests for our build scripts.
 * @file util.spec.js
 */

'use strict';

const path = require('path');

const chai = require('@lando/chai');
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
  it('should ignore specified patterns', () => {
    const files = find(['/some/source/dir/**.md', '/some/other/source/dir'], ['**/test2.md']);
    files.should.be.an('Array');
    files.should.have.lengthOf(1);
  });
  it('should return absolute paths', () => {
    const files = find(['/some/source/dir/**.md']);

    files.every((file) => path.isAbsolute(file)).should.equal(true);
  });
  it('should not return directories', () => {
    const files = find(['/some/**']);

    files.should.have.lengthOf(5);
    files.should.not.include(path.resolve('/some/source/dir'));
    files.should.not.include(path.resolve('/some/other/source/dir'));
  });
  it('should return a flattened array', () => {
    const files = find(['/some/source/dir/**.md', '/some/other/source/dir/**.md']);

    files.should.have.lengthOf(5);
    files.should.deep.equal(files.flat());
  });

  afterEach(() => {
    filesystem.restore();
  });
});
