import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it } from 'mocha';

import { generateApiDocumentation } from '../lib/api-documentation.ts';
import { repositoryRoot } from '../lib/toolchain.ts';
import {
  checkDocumentationLinks,
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

  it('should discover documented exports from the manifest and reject missing docblocks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'leia-api-docs-'));
    try {
      await mkdir(join(root, 'lib'));
      await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ include: ['lib/*.ts'] }));
      await writeFile(
        join(root, 'package.json'),
        JSON.stringify({
          name: '@lando/leia',
          exports: { '.': { import: { default: './dist/esm/lib/entry.js' } } },
        }),
      );
      const source = '/** coordinates scenarios. */\nexport class Leia {}\n';
      await writeFile(
        join(root, 'lib/entry.ts'),
        source + '/** newly exported helper. */\nexport const added = () => true;\n',
      );
      const markdown = await generateApiDocumentation(root);
      assert.match(markdown, /### `added`/);
      assert.match(markdown, /newly exported helper/);
      await writeFile(join(root, 'lib/entry.ts'), source + 'export const added = () => true;\n');
      await assert.rejects(generateApiDocumentation(root), /added needs a documentation comment/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('should reject README links to guides absent from an installed package', async () => {
    const root = await mkdtemp(join(tmpdir(), 'leia-package-docs-'));
    try {
      await writeFile(join(root, 'README.md'), '[Guide](./ADVANCED.md)');
      await assert.rejects(checkDocumentationLinks(root, ['README.md']), /missing path/);
      await writeFile(
        join(root, 'README.md'),
        '[Guide](https://github.com/lando/leia/blob/2.x/ADVANCED.md)',
      );
      await checkDocumentationLinks(root, ['README.md']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('should keep the generated API reference current', async () => {
    assert.equal(
      normalizeDocumentationLineEndings(await readFile(join(repositoryRoot, 'API.md'), 'utf8')),
      normalizeDocumentationLineEndings(await generateApiDocumentation(repositoryRoot)),
    );
  });
});
