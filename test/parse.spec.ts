import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

import { parse } from '../lib/parse.ts';

const dirname = fileURLToPath(new URL('.', import.meta.url));

describe('lib/parse', () => {
  it('should return leia testing metadata with the default keys', () => {
    const tests = parse([path.resolve(dirname, '..', 'examples', 'basic-example.md')]);
    const keys = [
      'cwd',
      'chaiPath',
      'runtimePath',
      'debugPath',
      'destination',
      'file',
      'id',
      'moduleFormat',
      'retry',
      'stdin',
      'text',
      'type',
      'tests',
      'version',
    ];
    assert.deepEqual(Object.keys(tests[0]!).sort(), [...keys].sort());
    assert.equal(tests[0]!.moduleFormat, 'esm');
    assert.match(tests[0]!.destination, /\.leia\.mjs$/);
  });
  it('should generate ESM destination metadata when requested', () => {
    const tests = parse([path.resolve(dirname, '..', 'examples', 'basic-example.md')], {
      moduleFormat: 'esm',
    });
    assert.equal(tests[0]!.moduleFormat, 'esm');
    assert.match(tests[0]!.destination, /\.leia\.mjs$/);
  });
  it('should normalize valid retry metadata and reject invalid values', () => {
    const file = path.resolve(dirname, '..', 'examples', 'basic-example.md');
    assert.equal(parse([file], { retry: '4' })[0]!.retry, 4);
    assert.throws(
      () => parse([file], { retry: 'four' }),
      (error: Error) => error.message.includes('--retry must be an integer between 0 and'),
    );
  });
  it('should organize tests into setup|test|cleanup buckets if applicable', () => {
    const tests = parse([path.resolve(dirname, '..', 'examples', 'setup-cleanup-example.md')]);
    assert.ok(Array.isArray(tests[0]!.tests.setup!) && tests[0]!.tests.setup!.length > 0);
    assert.ok(Array.isArray(tests[0]!.tests.test!) && tests[0]!.tests.test!.length > 0);
    assert.ok(Array.isArray(tests[0]!.tests.cleanup!) && tests[0]!.tests.cleanup!.length > 0);
    const tests2 = parse([path.resolve(dirname, '..', 'examples', 'basic-example.md')]);
    assert.notDeepEqual(Object.keys(tests2[0]!.tests).sort(), ['setup', 'cleanup'].sort());
    assert.deepEqual(Object.keys(tests2[0]!.tests).sort(), ['test', 'invalid'].sort());
  });
  it('should return tests as objects with description and command', () => {
    const tests = parse([path.resolve(dirname, '..', 'examples', 'basic-example.md')]);
    const test = tests[0]!.tests.test![0]!;

    assert.deepEqual(
      Object.keys(test).sort(),
      ['args', 'command', 'describe', 'id', 'number', 'script', 'section', 'shell', 'skip'].sort(),
    );
    assert.ok(Array.isArray(test.args));
    assert.ok(test.args.includes(test.script));
    assert.deepEqual(test.describe, ['should return true']);
    assert.equal(test.command, 'true');
  });
  it('should fold multiline continuations and preserve separate commands', () => {
    const tests = parse([path.resolve(dirname, '..', 'examples', 'basic-example.md')]);
    const test = tests[0]!.tests.test!.find(({ describe }) =>
      describe.includes('should not concatenate if escape is used'),
    );

    assert.ok(test);
    assert.equal(
      test.command,
      [
        'export TEST=thing  TEST2=stuff  TEST3=morestuff',
        'env | grep TEST',
        'env | grep TEST2',
        'env | grep TEST3',
        'unset TEST',
        'unset TEST2',
        'unset TEST3',
      ].join(os.EOL),
    );
  });
  it('should combine tests from multiple code blocks under one section', () => {
    const tests = parse([path.resolve(dirname, 'parse-code-blocks.md')]);

    assert.deepEqual(
      tests[0]!.tests.test!.map((test) => test.describe[0]!),
      ['should parse the first code block', 'should parse the second code block'],
    );
    assert.deepEqual(
      tests[0]!.tests.test!.map((test) => test.command),
      ['echo first', 'echo second'],
    );
  });
  it('should combine tests from repeated setup, test, and cleanup sections', () => {
    const tests = parse([path.resolve(dirname, 'parse-sections.md')]);

    assert.deepEqual(
      tests[0]!.tests.setup!.map((test) => test.describe[0]!),
      ['should run first setup', 'should run second setup'],
    );
    assert.deepEqual(
      tests[0]!.tests.test!.map((test) => test.describe[0]!),
      ['should run first test', 'should run second test'],
    );
    assert.deepEqual(
      tests[0]!.tests.cleanup!.map((test) => test.describe[0]!),
      ['should run first cleanup', 'should run second cleanup'],
    );
    assert.deepEqual(
      tests[0]!.tests.setup!.map((test) => test.number),
      [1, 2],
    );
    assert.deepEqual(
      tests[0]!.tests.test!.map((test) => test.number),
      [1, 2],
    );
    assert.deepEqual(
      tests[0]!.tests.cleanup!.map((test) => test.number),
      [1, 2],
    );
  });
});
