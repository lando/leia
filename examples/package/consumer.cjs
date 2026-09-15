const assert = require('node:assert/strict');

const Leia = require('@lando/leia');
const check = require('./assert-api.cjs');

assert.equal(Leia, Leia.Leia);
assert.equal(Leia, Leia.default);
assert.equal(require('@lando/leia/package.json').name, '@lando/leia');
assert.match(require.resolve('@lando/leia'), /[/\\]dist[/\\]cjs[/\\]/);
check(
  Leia,
  Object.fromEntries(
    ['find', 'parse', 'generate', 'run', 'shell', 'module-format', 'compiler'].map((name) => [
      name,
      require(`@lando/leia/${name}`),
    ]),
  ),
);
for (const subpath of [
  'lib/parse',
  'dist/cjs/lib/parse.cjs',
  'utils/process-tree',
  'runtime',
  'cli',
])
  assert.throws(() => require(`@lando/leia/${subpath}`), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });

require('@lando/leia/run')
  .runAsync(['probe.mjs'])
  .then((runner) => {
    assert.equal(typeof runner.run, 'function');
  })
  .catch((error) => {
    throw error;
  });
