/**
 * Integration tests for CLI module format behavior inside package scopes.
 * @file module-format-integration.spec.js
 */

'use strict';

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const chai = require('@lando/chai');
const fsExtra = require('fs-extra');

chai.should();

const bin = path.resolve(__dirname, '..', 'bin', 'leia');
const fixturesDir = path.resolve(__dirname, 'fixtures', 'module-formats');
const fixtureDirs = [
  path.join(fixturesDir, 'commonjs'),
  path.join(fixturesDir, 'esm'),
  path.join(fixturesDir, 'untyped'),
  path.join(fixturesDir, 'nested', 'commonjs'),
];
const findHarnesses = (directory) => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {recursive: true})
    .filter((file) => /\.leia\.(cjs|mjs)$/.test(file))
    .map((file) => path.join(directory, file));
};
const runLeia = (fixtureDir, moduleFormat, source = 'scenario.md') => {
  const tempDir = path.join(fixtureDir, '.tmp');
  fsExtra.removeSync(tempDir);
  fsExtra.mkdirpSync(tempDir);

  const result = spawnSync(
    process.execPath,
    [bin, source, '--module-format', moduleFormat, '--retry', '2', '--stdin', '--timeout', '5'],
    {
      cwd: fixtureDir,
      encoding: 'utf8',
      env: {...process.env, TEMP: tempDir, TMP: tempDir, TMPDIR: tempDir},
    },
  );

  result.status.should.equal(0, result.stderr || result.stdout);
  fs.existsSync(path.join(tempDir, 'package.json')).should.equal(false);
  fs.existsSync(path.join(fixtureDir, 'leia-state.txt')).should.equal(false);
  return findHarnesses(tempDir);
};

describe('CLI module format integration', function() {
  this.timeout(30000);

  afterEach(() => fixtureDirs.forEach((fixtureDir) => {
    fsExtra.removeSync(path.join(fixtureDir, '.tmp'));
    fsExtra.removeSync(path.join(fixtureDir, 'leia-state.txt'));
  }));

  it('should preserve the repository-local CommonJS failure baseline under an ESM package', () => {
    const fixtureDir = path.join(fixturesDir, 'esm');
    const tempDir = path.join(fixtureDir, '.tmp');
    const harness = path.join(tempDir, 'legacy.leia.js');
    fsExtra.mkdirpSync(tempDir);
    fs.writeFileSync(harness, "require('node:path');\n");

    const result = spawnSync(process.execPath, [harness], {encoding: 'utf8'});
    result.status.should.not.equal(0);
  });

  it('should expose the module format option and reject unsupported values', () => {
    const fixtureDir = path.join(fixturesDir, 'commonjs');
    const help = spawnSync(process.execPath, [bin, '--help'], {cwd: fixtureDir, encoding: 'utf8'});
    const invalid = spawnSync(
      process.execPath,
      [bin, 'scenario.md', '--module-format', 'amd'],
      {cwd: fixtureDir, encoding: 'utf8'},
    );

    help.status.should.equal(0, help.stderr);
    help.stdout.should.include('--module-format=auto|commonjs|esm');
    help.stdout.should.include('[default: auto]');
    invalid.status.should.not.equal(0);
    `${invalid.stdout}\n${invalid.stderr}`.should.include('module-format');
  });

  it('should auto-detect CommonJS, ESM, untyped, and nearest nested packages', () => {
    runLeia(path.join(fixturesDir, 'commonjs'), 'auto')[0].should.match(/\.leia\.cjs$/);
    runLeia(path.join(fixturesDir, 'esm'), 'auto')[0].should.match(/\.leia\.mjs$/);
    runLeia(path.join(fixturesDir, 'untyped'), 'auto')[0].should.match(/\.leia\.cjs$/);
    runLeia(path.join(fixturesDir, 'nested', 'commonjs'), 'auto')[0].should.match(/\.leia\.cjs$/);
  });

  it('should resolve auto from the initial working directory instead of the source package', () => {
    runLeia(path.join(fixturesDir, 'commonjs'), 'auto', '../esm/scenario.md')[0].should.match(/\.leia\.cjs$/);
  });

  it('should let explicit formats override package detection', () => {
    runLeia(path.join(fixturesDir, 'esm'), 'commonjs')[0].should.match(/\.leia\.cjs$/);
    runLeia(path.join(fixturesDir, 'commonjs'), 'esm')[0].should.match(/\.leia\.mjs$/);
  });
});
