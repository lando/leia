import assert from 'node:assert/strict';

interface FileCoverage {
  path: string;
  statementMap: Record<string, { start: { line: number }; end: { line: number } }>;
  s: Record<string, number>;
  f: Record<string, number>;
}

/** Reject empty, partial, generated-path, or out-of-bounds source coverage reports. */
export const validateCoverage = (report: unknown, sources: Record<string, string>): void => {
  assert.ok(
    report && typeof report === 'object' && !Array.isArray(report),
    'Invalid coverage report',
  );
  const files = report as Record<string, FileCoverage>;
  assert.ok(Object.keys(sources).length > 0, 'No application sources found in build maps');
  assert.deepEqual(
    Object.keys(files).sort(),
    Object.keys(sources).sort(),
    'Coverage source inventory mismatch',
  );
  for (const [file, source] of Object.entries(sources)) {
    const coverage = files[file]!;
    assert.equal(coverage.path, file, 'Coverage must name the original source');
    const lines = source.split('\n').length;
    assert.ok(Object.keys(coverage.statementMap).length > 0, `Empty coverage for ${file}`);
    for (const [id, location] of Object.entries(coverage.statementMap)) {
      assert.ok(
        location.start.line >= 1 &&
          location.end.line >= location.start.line &&
          location.end.line <= lines,
        `Invalid source location in ${file}`,
      );
      assert.ok(
        Number.isInteger(coverage.s[id]) && coverage.s[id]! >= 0,
        `Invalid hit count in ${file}`,
      );
    }
  }
  assert.ok(
    Object.values(files).some((file) => Object.values(file.f).some((hits) => hits > 0)),
    'Coverage has no executed functions',
  );
};
