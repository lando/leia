import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

export interface DocumentationExample {
  language: string;
  source: string;
}

/** Extract one explicitly named fenced block without maintaining a second fixture copy. */
export const extractDocumentationExample = (markdown: string, id: string): DocumentationExample => {
  const marker = `<!-- leia-example:${id} -->`;
  const markerIndex = markdown.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing documentation example "${id}".`);
  assert.equal(
    markdown.indexOf(marker, markerIndex + marker.length),
    -1,
    `Duplicate documentation example "${id}".`,
  );

  const afterMarker = markdown.slice(markerIndex + marker.length);
  const opening = afterMarker.match(/^\s*\r?\n(`{3,})([^\r\n]*)\r?\n/);
  assert.ok(opening, `Documentation example "${id}" must be followed by a fenced block.`);
  const fence = opening[1]!;
  const body = afterMarker.slice(opening[0].length);
  const closing = new RegExp(`^${fence}\\s*$`, 'm').exec(body);
  assert.ok(closing, `Documentation example "${id}" has no closing fence.`);

  return {
    language: opening[2]!.trim().split(/\s+/)[0] ?? '',
    source: body.slice(0, closing.index),
  };
};

const anchors = (markdown: string): Set<string> => {
  const counts = new Map<string, number>();
  const values = new Set<string>();
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = match[1]!
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[`*_~]/g, '')
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    values.add(count === 0 ? base : `${base}-${count}`);
  }
  return values;
};

/** Fail when a repository-relative Markdown link or heading fragment cannot be resolved. */
export const checkDocumentationLinks = async (root: string, documents: string[]): Promise<void> => {
  const repository = resolve(root);
  for (const document of documents) {
    const sourceFile = resolve(repository, document);
    const markdown = await readFile(sourceFile, 'utf8');
    for (const match of markdown.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1]!.replace(/^<|>$/g, '');
      if (/^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      const [pathPart = '', encodedFragment] = target.split('#', 2);
      const targetFile =
        pathPart === ''
          ? sourceFile
          : pathPart.startsWith('/')
            ? resolve(repository, `.${decodeURIComponent(pathPart)}`)
            : resolve(dirname(sourceFile), decodeURIComponent(pathPart));
      assert.ok(
        targetFile === repository || targetFile.startsWith(`${repository}${sep}`),
        `${document} links outside the repository: ${target}`,
      );
      await assert.doesNotReject(
        () => stat(targetFile),
        `${document} links to a missing path: ${target}`,
      );
      if (encodedFragment !== undefined) {
        const fragment = decodeURIComponent(encodedFragment).toLowerCase();
        assert.ok(
          anchors(await readFile(targetFile, 'utf8')).has(fragment),
          `${document} links to a missing heading: ${target}`,
        );
      }
    }
  }
};
