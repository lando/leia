#!/usr/bin/env bun

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { generateApiDocumentation } from '../lib/api-documentation.ts';
import { checkToolchain, repositoryRoot } from '../lib/toolchain.ts';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--check')) throw new Error('Usage: docs:api [--check]');

await checkToolchain(repositoryRoot);
const destination = join(repositoryRoot, 'API.md');
const generated = await generateApiDocumentation(repositoryRoot);
if (args.includes('--check')) {
  assert.equal(
    await readFile(destination, 'utf8'),
    generated,
    'API.md is stale. Run `bun run docs:api` and commit the result.',
  );
} else {
  await writeFile(destination, generated);
}
