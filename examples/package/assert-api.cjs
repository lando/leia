const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = (Leia, modules) => {
  const expected = {
    find: ['find'],
    parse: ['normalizeCommand', 'normalizeMarkdown', 'parse', 'readMarkdown'],
    generate: ['compileHarness', 'generate'],
    run: ['exitCode', 'run', 'runAsync'],
    shell: ['getShell'],
    'module-format': ['formats', 'resolveModuleFormat'],
    compiler: [
      'compileHarness',
      'find',
      'formats',
      'generate',
      'getShell',
      'normalizeCommand',
      'normalizeMarkdown',
      'parse',
      'readMarkdown',
      'resolveModuleFormat',
    ],
  };
  for (const [name, keys] of Object.entries(expected)) {
    assert.deepEqual(Object.keys(modules[name]).sort(), keys.sort(), name);
  }
  assert.equal(typeof Leia, 'function');
  const leia = new Leia();
  for (const name of ['find', 'parse', 'generate', 'run', 'runAsync', 'resolveModuleFormat'])
    assert.equal(typeof leia[name], 'function');
  const files = modules.find.find(['input.scenario']);
  assert.equal(files.length, 1);
  const shell = process.platform === 'win32' ? 'cmd' : 'sh';
  assert.equal(modules.shell.getShell(shell).name, shell);
  assert.equal(modules['module-format'].resolveModuleFormat('auto'), 'commonjs');
  assert.equal(modules.parse.normalizeCommand('# label\necho hello', shell), 'echo hello');
  for (const moduleFormat of ['esm', 'commonjs']) {
    const options = { moduleFormat, shell };
    const harnesses = modules.parse.parse(files, options);
    assert.deepEqual(
      modules.parse.normalizeMarkdown(modules.parse.readMarkdown(files), options),
      harnesses,
    );
    assert.deepEqual(modules.compiler.parse(files, options), harnesses);
    const compiled = modules.generate.compileHarness(harnesses[0]);
    const [generated] = modules.generate.generate(harnesses);
    assert.equal(fs.readFileSync(generated, 'utf8'), compiled.source);
    assert.ok(generated.endsWith(moduleFormat === 'esm' ? '.leia.mjs' : '.leia.cjs'));
    fs.rmSync(path.dirname(generated), { recursive: true, force: true });
  }
  const runner = modules.run.run(['probe.cjs']);
  assert.equal(typeof runner.run, 'function');
  assert.equal(modules.run.exitCode(runner, 0), 0);
  assert.equal(modules.run.exitCode(runner, 1), 1);
  assert.throws(() => modules.run.run(['probe.mjs']), /runAsync/);
  assert.throws(
    () => modules.parse.parse([], { retry: -1 }),
    (error) => {
      assert.match(error.stack, /parse-non-negative-integer\.ts:\d+:\d+/);
      return true;
    },
  );
};
