/**
 * Tests for generated harness module format resolution.
 * @file module-format.spec.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const chai = require('@lando/chai');
const fsExtra = require('fs-extra');

const resolveModuleFormat = require('../lib/module-format');

chai.should();

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-module-format-'));

describe('lib/module-format', () => {
  after(() => fsExtra.removeSync(tempDir));

  it('should accept explicit module formats without package detection', () => {
    resolveModuleFormat('commonjs', path.join(tempDir, 'missing')).should.equal('commonjs');
    resolveModuleFormat('esm', path.join(tempDir, 'missing')).should.equal('esm');
  });

  it('should reject unsupported module formats', () => {
    (() => resolveModuleFormat('amd', tempDir)).should.throw(
      'Unsupported module format "amd". Expected one of: auto, commonjs, esm.',
    );
  });

  it('should select ESM from the nearest module package', () => {
    const packageDir = path.join(tempDir, 'module-package');
    const nestedDir = path.join(packageDir, 'nested', 'deeper');
    fsExtra.mkdirpSync(nestedDir);
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({type: 'module'}));

    resolveModuleFormat('auto', nestedDir).should.equal('esm');
  });

  it('should let the nearest CommonJS or untyped package override a module parent', () => {
    const packageDir = path.join(tempDir, 'nearest-package');
    const commonjsDir = path.join(packageDir, 'commonjs');
    const untypedDir = path.join(packageDir, 'untyped');
    fsExtra.mkdirpSync(commonjsDir);
    fsExtra.mkdirpSync(untypedDir);
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({type: 'module'}));
    fs.writeFileSync(path.join(commonjsDir, 'package.json'), JSON.stringify({type: 'commonjs'}));
    fs.writeFileSync(path.join(untypedDir, 'package.json'), JSON.stringify({name: 'untyped'}));

    resolveModuleFormat('auto', commonjsDir).should.equal('commonjs');
    resolveModuleFormat('auto', untypedDir).should.equal('commonjs');
  });

  it('should default to CommonJS when no package exists', () => {
    const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-no-package-'));
    try {
      resolveModuleFormat('auto', packageDir).should.equal('commonjs');
    } finally {
      fsExtra.removeSync(packageDir);
    }
  });

  it('should report a malformed nearest package', () => {
    const packageDir = path.join(tempDir, 'malformed-package');
    const packageFile = path.join(packageDir, 'package.json');
    fsExtra.mkdirpSync(packageDir);
    fs.writeFileSync(packageFile, '{not json');

    (() => resolveModuleFormat('auto', packageDir)).should.throw(
      `Could not parse nearest package.json at ${packageFile}`,
    );
  });

  it('should report an unreadable nearest package', () => {
    const packageDir = path.join(tempDir, 'unreadable-package');
    const packageFile = path.join(packageDir, 'package.json');
    const readFileSync = fs.readFileSync;
    fsExtra.mkdirpSync(packageDir);
    fs.writeFileSync(packageFile, '{}');

    fs.readFileSync = (file, ...args) => {
      if (path.resolve(file) === packageFile) {
        const error = new Error('permission denied');
        error.code = 'EACCES';
        throw error;
      }
      return readFileSync(file, ...args);
    };

    try {
      (() => resolveModuleFormat('auto', packageDir)).should.throw(
        `Could not read nearest package.json at ${packageFile}: permission denied`,
      );
    } finally {
      fs.readFileSync = readFileSync;
    }
  });
});
