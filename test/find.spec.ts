import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { find } from '../lib/find.ts';

describe('lib/find', () => {
  let tempDir: string;
  const pattern = (relative: string): string =>
    path.join(tempDir, relative).split(path.sep).join('/');
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-find-'));
    for (const [directory, count] of [
      ['source/dir', 2],
      ['other/source/dir', 3],
    ] as const) {
      fs.mkdirSync(path.join(tempDir, directory), { recursive: true });
      for (let index = 1; index <= count; index++)
        fs.writeFileSync(path.join(tempDir, directory, `test${index}.md`), 'stuff');
    }
  });

  it('should return an array of files', () => {
    const files = find([pattern('source/dir/**.md')]);
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 2);
  });
  it('should return an unique array of files', () => {
    const files = find([pattern('source/dir/**.md'), pattern('source/dir/**.md')]);
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 2);
  });
  it('should return an empty array if no matches', () => {
    const files = find([pattern('missing/**.md')]);
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 0);
  });
  it('should ignore specified patterns', () => {
    const files = find([pattern('source/dir/**.md'), pattern('other/source/dir')], ['**/test2.md']);
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 1);
  });
  it('should return absolute paths', () => {
    const files = find([pattern('source/dir/**.md')]);

    assert.equal(
      files.every((file) => path.isAbsolute(file)),
      true,
    );
  });
  it('should not return directories', () => {
    const files = find([pattern('**')]);

    assert.equal(files.length, 5);
    assert.ok(!files.includes(path.resolve(pattern('source/dir'))));
    assert.ok(!files.includes(path.resolve(pattern('other/source/dir'))));
  });
  it('should return a flattened array', () => {
    const files = find([pattern('source/dir/**.md'), pattern('other/source/dir/**.md')]);

    assert.equal(files.length, 5);
    assert.deepEqual(files, files.flat());
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
