import assert from 'node:assert/strict';

import { validateCoverage } from '../utils/validate-coverage.ts';

const sources = { 'lib/sample.ts': 'export const sample = () => 1;\n' };
const file = (hits = 1) => ({
  path: 'lib/sample.ts',
  statementMap: { '0': { start: { line: 1 }, end: { line: 1 } } },
  s: { '0': hits },
  f: { '0': hits },
});

describe('tooling/utils/validate-coverage', () => {
  it('should accept source-aligned coverage including untested files', () => {
    const untested = 'lib/untested.ts';
    validateCoverage(
      {
        'lib/sample.ts': file(),
        [untested]: { ...file(0), path: untested },
      },
      { ...sources, [untested]: 'export const untested = () => 0;\n' },
    );
  });
  it('should reject missing, empty, or generated-path reports', () => {
    for (const report of [null, [], {}, { 'dist/esm/lib/sample.js': file() }])
      assert.throws(() => validateCoverage(report, sources));
    assert.throws(() => validateCoverage({}, {}), /No application sources/);
    assert.throws(
      () => validateCoverage({ 'lib/sample.ts': { ...file(), statementMap: {} } }, sources),
      /Empty coverage/,
    );
  });
  it('should reject invalid source locations, counters, and reports without executed functions', () => {
    assert.throws(
      () =>
        validateCoverage(
          {
            'lib/sample.ts': {
              ...file(),
              statementMap: { '0': { start: { line: 1 }, end: { line: 100 } } },
            },
          },
          sources,
        ),
      /Invalid source location/,
    );
    assert.throws(
      () => validateCoverage({ 'lib/sample.ts': file(-1) }, sources),
      /Invalid hit count/,
    );
    assert.throws(
      () => validateCoverage({ 'lib/sample.ts': file(0) }, sources),
      /no executed functions/,
    );
    assert.throws(
      () => validateCoverage({ 'lib/sample.ts': { ...file(), path: 'other.ts' } }, sources),
      /original source/,
    );
  });
});
