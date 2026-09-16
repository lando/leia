import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { validateCoverage } from '../utils/validate-coverage.ts';

/** maps embed the source, so validation still works after ci removes application source. */
export const checkCoverage = async (root: string): Promise<void> => {
  const output = join(root, 'dist/esm');
  const sources: Record<string, string> = {};
  for (const file of await readdir(output, { recursive: true })) {
    if (!file.endsWith('.js.map')) continue;
    const filename = join(output, file);
    const map = JSON.parse(await readFile(filename, 'utf8')) as {
      sources: string[];
      sourcesContent: string[];
    };
    for (const [index, source] of map.sources.entries()) {
      const path = resolve(dirname(filename), source);
      assert.match(
        relative(root, path).split(sep).join('/'),
        /^(lib|utils)\/.+\.ts$/,
        'Map points outside application source',
      );
      const content = map.sourcesContent[index];
      assert.equal(typeof content, 'string', 'Map must embed original source');
      if (sources[path] !== undefined)
        assert.equal(content, sources[path], 'Maps disagree on source content');
      sources[path] = content!;
    }
  }
  validateCoverage(
    JSON.parse(await readFile(join(root, 'coverage/coverage-final.json'), 'utf8')),
    sources,
  );
  process.stdout.write(
    `Verified coverage for ${Object.keys(sources).length} TypeScript application sources.\n`,
  );
};
