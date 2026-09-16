import assert from 'node:assert/strict';

import Leia, { Leia as NamedLeia } from '@lando/leia';
import * as find from '@lando/leia/find';
import * as parse from '@lando/leia/parse';
import * as generate from '@lando/leia/generate';
import * as run from '@lando/leia/run';
import * as shell from '@lando/leia/shell';
import * as moduleFormat from '@lando/leia/module-format';
import * as compiler from '@lando/leia/compiler';
import metadata from '@lando/leia/package.json' with { type: 'json' };

import check from './assert-api.cjs';

assert.equal(Leia, NamedLeia);
assert.equal(metadata.name, '@lando/leia');
assert.match(import.meta.resolve('@lando/leia'), /\/dist\/esm\//);
check(Leia, { find, parse, generate, run, shell, 'module-format': moduleFormat, compiler });
for (const subpath of [
  'lib/parse',
  'dist/esm/lib/parse.js',
  'utils/process-tree',
  'runtime',
  'cli',
])
  await assert.rejects(import(`@lando/leia/${subpath}`), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });

assert.equal(typeof (await run.runAsync(['probe.mjs'])).run, 'function');
