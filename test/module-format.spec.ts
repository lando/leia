import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveModuleFormat } from '../lib/module-format.ts';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-module-format-'));

describe('lib/module-format', () => {
  after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  it('should accept explicit module formats without package detection', () => {
    assert.equal(resolveModuleFormat('commonjs', path.join(tempDir, 'missing')), 'commonjs');
    assert.equal(resolveModuleFormat('esm', path.join(tempDir, 'missing')), 'esm');
  });

  it('should reject unsupported module formats', () => {
    assert.throws(
      () => resolveModuleFormat('amd', tempDir),
      (error: Error) =>
        error.message.includes(
          'Unsupported module format "amd". Expected one of: auto, commonjs, esm.',
        ),
    );
  });

  it('should select ESM from the nearest module package', () => {
    const packageDir = path.join(tempDir, 'module-package');
    const nestedDir = path.join(packageDir, 'nested', 'deeper');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ type: 'module' }));

    assert.equal(resolveModuleFormat('auto', nestedDir), 'esm');
  });

  it('should let the nearest CommonJS or untyped package override a module parent', () => {
    const packageDir = path.join(tempDir, 'nearest-package');
    const commonjsDir = path.join(packageDir, 'commonjs');
    const untypedDir = path.join(packageDir, 'untyped');
    fs.mkdirSync(commonjsDir, { recursive: true });
    fs.mkdirSync(untypedDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ type: 'module' }));
    fs.writeFileSync(path.join(commonjsDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
    fs.writeFileSync(path.join(untypedDir, 'package.json'), JSON.stringify({ name: 'untyped' }));

    assert.equal(resolveModuleFormat('auto', commonjsDir), 'commonjs');
    assert.equal(resolveModuleFormat('auto', untypedDir), 'commonjs');
  });

  it('should default to CommonJS when no package exists', () => {
    const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-no-package-'));
    try {
      assert.equal(resolveModuleFormat('auto', packageDir), 'commonjs');
    } finally {
      fs.rmSync(packageDir, { recursive: true, force: true });
    }
  });

  it('should report a malformed nearest package', () => {
    const packageDir = path.join(tempDir, 'malformed-package');
    const packageFile = path.join(packageDir, 'package.json');
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(packageFile, '{not json');

    assert.throws(
      () => resolveModuleFormat('auto', packageDir),
      (error: Error) =>
        error.message.includes(`Could not parse nearest package.json at ${packageFile}`),
    );
  });

  it('should report an unreadable nearest package', () => {
    const packageDir = path.join(tempDir, 'unreadable-package');
    const packageFile = path.join(packageDir, 'package.json');
    const readFileSync = fs.readFileSync;
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(packageFile, '{}');

    fs.readFileSync = ((...args: Parameters<typeof fs.readFileSync>) => {
      const [file] = args;
      if (typeof file === 'string' && path.resolve(file) === packageFile) {
        throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
      }
      return readFileSync(...args);
    }) as typeof fs.readFileSync;

    try {
      assert.throws(
        () => resolveModuleFormat('auto', packageDir),
        (error: Error) =>
          error.message.includes(
            `Could not read nearest package.json at ${packageFile}: permission denied`,
          ),
      );
    } finally {
      fs.readFileSync = readFileSync;
    }
  });
});
