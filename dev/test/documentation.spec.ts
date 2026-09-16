import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, it } from 'mocha';

import { generateApiDocumentation } from '../lib/api-documentation.ts';
import { repositoryRoot } from '../lib/toolchain.ts';
import {
  extractDocumentationExample,
  normalizeDocumentationLineEndings,
} from '../utils/documentation.ts';

describe('dev/utils/documentation', () => {
  it('should normalize Windows and legacy line endings', () => {
    assert.equal(normalizeDocumentationLineEndings('one\r\ntwo\rthree\n'), 'one\ntwo\nthree\n');
  });

  it('should extract a named block and preserve nested fences', () => {
    const markdown = [
      '<!-- leia-example:scenario -->',
      '',
      '````md',
      '# Example',
      '',
      '```sh',
      'echo hello',
      '```',
      '````',
      '',
    ].join('\n');

    assert.deepEqual(extractDocumentationExample(markdown, 'scenario'), {
      language: 'md',
      source: ['# Example', '', '```sh', 'echo hello', '```', ''].join('\n'),
    });
  });

  it('should reject missing and duplicate examples', () => {
    assert.throws(() => extractDocumentationExample('', 'missing'), /Missing documentation/);
    assert.throws(
      () =>
        extractDocumentationExample(
          '<!-- leia-example:duplicate -->\n```sh\ntrue\n```\n<!-- leia-example:duplicate -->',
          'duplicate',
        ),
      /Duplicate documentation/,
    );
  });

  it('should reject an example without a complete fence', () => {
    assert.throws(
      () => extractDocumentationExample('<!-- leia-example:broken -->\n```sh\ntrue', 'broken'),
      /closing fence/,
    );
  });

  it('should keep the generated API reference current', async () => {
    assert.equal(
      normalizeDocumentationLineEndings(await readFile(join(repositoryRoot, 'API.md'), 'utf8')),
      normalizeDocumentationLineEndings(await generateApiDocumentation(repositoryRoot)),
    );
  });
});
