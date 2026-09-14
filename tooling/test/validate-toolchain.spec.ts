import assert from 'node:assert/strict';

import { describe, it } from 'mocha';

import validateToolchain from '../utils/validate-toolchain.ts';

describe('tooling/utils/validate-toolchain', () => {
  it('should accept matching exact version metadata and runtime', () => {
    assert.doesNotThrow(() => validateToolchain('1.2.3', 'bun@1.2.3', '1.2.3'));
  });

  it('should reject a missing or non-exact authoritative version', () => {
    for (const version of ['', '^1.2.3', 'latest', '1.2']) {
      assert.throws(
        () => validateToolchain(version, `bun@${version}`, version),
        /exact Bun version/,
      );
    }
  });

  it('should reject missing, non-Bun, and inconsistent package-manager metadata', () => {
    for (const metadata of [undefined, null, 123, 'npm@1.2.3', 'bun@1.2.4']) {
      assert.throws(
        () => validateToolchain('1.2.3', metadata, '1.2.3'),
        /packageManager must match/,
      );
    }
  });

  it('should identify the required runtime when Bun does not match the pin', () => {
    assert.throws(
      () => validateToolchain('1.2.3', 'bun@1.2.3', '1.2.4'),
      /Use Bun 1\.2\.3.*found 1\.2\.4/,
    );
  });
});
