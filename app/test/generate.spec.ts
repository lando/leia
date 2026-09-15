import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import type { ProcessRequest } from '../lib/execute.ts';
const require = createRequire(import.meta.url);
import { generate } from '../lib/generate.ts';
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leia-generate-'));
const normalizePath = (file: string) => file.split(path.sep).join('/');
const commands = [
  "printf '%s\\n' 'both `$INTERACTIVE` and `$NONINTERACTIVE` are set.'",
  'printf \'%s\\n\' "${HOME}"',
  "printf '\\033[31mred\\033[0m\\n'",
  "printf '%s\\n' abc | sed -E 's/(a)/\\1/'",
  "printf '%s\\n' \"$(printf '%s' substitution)\"",
  'printf \'%s\\n\' "$HOME"',
  "printf '%s\\n' '\"quoted\" \\\\literal\\\\'",
  "printf '%s\\n' first\nprintf '%s\\n' second",
];
const getTests = (moduleFormat = 'commonjs') =>
  [
    {
      file: normalizePath(path.join(tempDir, 'mock.md')),
      id: 'mock',
      destination: path.join(tempDir, `mock.leia.${moduleFormat === 'esm' ? 'mjs' : 'cjs'}`),
      moduleFormat,
      retry: 3,
      cwd: normalizePath(tempDir),
      chaiPath: normalizePath(require.resolve('@lando/chai')),
      runtimePath: normalizePath(require.resolve('../lib/runtime.ts')),
      debugPath: normalizePath(require.resolve('debug')),
      stdin: 'pipe',
      text: 'Mock',
      type: 'title',
      version: 'test',
      tests: {
        test: commands.map((command, index) => {
          const script = path.join(tempDir, `mock-${moduleFormat}-${index}.leia.sh`);
          return {
            args: [normalizePath(script)],
            command,
            describe: [`mock test ${index}`],
            id: 'mock',
            number: index + 1,
            script,
            section: 'test',
            shell: 'sh',
            skip: false,
          };
        }),
      },
    },
  ] satisfies [object];

describe('generate', () => {
  after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  it('should return a list of outputted files', () => {
    const tests = getTests();
    const files = generate(tests);
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 1);
  });
  it('should preserve shell command text byte-for-byte', () => {
    ['commonjs', 'esm'].forEach((moduleFormat) => {
      const tests = getTests(moduleFormat);
      generate(tests);
      tests[0].tests.test.forEach((test) => {
        assert.equal(fs.readFileSync(test.script, 'utf8'), test.command);
      });
    });
  });
  it('should create valid CommonJS mocha tests with serialized debug commands', () => {
    const tests = getTests();
    generate(tests);
    const source = fs.readFileSync(tests[0].destination, 'utf8');
    assert.doesNotThrow(() => new vm.Script(source, { filename: tests[0].destination }));
    tests[0].tests.test.forEach((test) => {
      assert.ok(source.includes(`commands: ${JSON.stringify(test.command)}`));
    });
  });
  it('should create valid ESM mocha tests using CommonJS dependencies', () => {
    const tests = getTests('esm');
    generate(tests);
    const source = fs.readFileSync(tests[0].destination, 'utf8');
    assert.ok(source.includes("import {createRequire} from 'node:module';"));
    assert.ok(source.includes('const require = createRequire(import.meta.url);'));
    assert.ok(source.includes(`const chai = require(${JSON.stringify(tests[0].chaiPath)});`));
    tests[0].tests.test.forEach((test) => {
      assert.ok(source.includes(`commands: ${JSON.stringify(test.command)}`));
    });
  });
  it('should preserve quote and backslash metadata in valid harnesses', () => {
    ['commonjs', 'esm'].forEach((moduleFormat) => {
      const tests = getTests(moduleFormat);
      const special = `quote'"\\backslash`;
      tests[0].tests.test = [tests[0].tests.test[0]!];
      tests[0].id = `mock-${special}`;
      tests[0].cwd = `C:\\Leia's "tests"\\cwd`;
      tests[0].chaiPath = `C:\\Leia's "modules"\\chai`;
      tests[0].runtimePath = `C:\\Leia's "modules"\\runtime`;
      tests[0].debugPath = `C:\\Leia's "modules"\\debug`;
      tests[0].stdin = 'inherit';
      tests[0].version = `v1-${special}`;
      tests[0].tests.test[0]!.args = [`--value=${special}`, `C:\\Leia's "scripts"\\test`];
      tests[0].tests.test[0]!.describe = [`should preserve ${special}`];
      tests[0].tests.test[0]!.id = `test-${special}`;
      tests[0].tests.test[0]!.number = 7;
      tests[0].tests.test[0]!.section = `section-${special}`;
      tests[0].tests.test[0]!.shell = `C:\\Leia's "shell"\\sh`;

      generate(tests);
      const source = fs.readFileSync(tests[0].destination, 'utf8');
      const syntax = spawnSync('node', ['--check', tests[0].destination], {
        encoding: 'utf8',
      });
      assert.equal(syntax.status, 0, syntax.stderr);
      [
        tests[0].id,
        tests[0].cwd,
        tests[0].chaiPath,
        tests[0].runtimePath,
        tests[0].debugPath,
        tests[0].version,
        tests[0].tests.test[0]!.describe[0],
        tests[0].tests.test[0]!.id,
        tests[0].tests.test[0]!.section,
        tests[0].tests.test[0]!.shell,
      ].forEach((value) => assert.ok(source.includes(JSON.stringify(value))));
      assert.ok(source.includes(JSON.stringify(tests[0].tests.test[0]!.args)));

      if (moduleFormat === 'commonjs') {
        const captured: {
          chdir: string[];
          debug: unknown[][];
          descriptions: string[];
          requires: string[];
          spawns: (Omit<ProcessRequest, 'env'> & { env: Record<string, unknown> })[];
          id?: string;
          retry?: number;
          namespace?: string;
        } = { chdir: [], debug: [], descriptions: [], requires: [], spawns: [] };
        const runtimeProcess = {
          env: {} as Record<string, unknown>,
          chdir: (cwd: string) => captured.chdir.push(cwd),
        };
        const runScenario = (_context: unknown, request: ProcessRequest) => {
          captured.spawns.push({ ...request, env: { ...runtimeProcess.env } });
          return Promise.resolve();
        };
        const suite = {
          test: { currentRetry: () => 0 },
          skip: () => {},
          retries: (retry: number) => (captured.retry = retry),
        };
        const context = {
          describe: (id: string, callback: () => void) => {
            captured.id = id;
            callback.call(suite);
          },
          it: (description: string, callback: () => void) => {
            captured.descriptions.push(description);
            callback.call(suite);
          },
          process: runtimeProcess,
          require: (dependency: string) => {
            captured.requires.push(dependency);
            if (dependency === tests[0].chaiPath) return { should: () => {} };
            if (dependency === tests[0].runtimePath) return { runScenario };
            if (dependency === tests[0].debugPath) {
              return (namespace: string) => {
                captured.namespace = namespace;
                return (...args: unknown[]) => captured.debug.push(args);
              };
            }
            if (dependency === 'path') return {};
            throw new Error(`Unexpected dependency ${dependency}`);
          },
        };
        new vm.Script(source, { filename: tests[0].destination }).runInNewContext(context);

        const fromVm = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
        assert.equal(captured.id, tests[0].id);
        assert.equal(captured.retry, tests[0].retry);
        assert.equal(captured.namespace, `leia:test:${tests[0].id}`);
        assert.deepEqual(captured.requires, [
          tests[0].chaiPath,
          tests[0].runtimePath,
          tests[0].debugPath,
          'path',
        ]);
        assert.deepEqual(captured.descriptions, [tests[0].tests.test[0]!.describe[0]]);
        assert.deepEqual(captured.chdir, [tests[0].cwd]);
        assert.equal(captured.spawns[0]!.shell, tests[0].tests.test[0]!.shell);
        assert.deepEqual(fromVm(captured.spawns[0]!.args), tests[0].tests.test[0]!.args);
        assert.equal(captured.spawns[0]!.stdin, tests[0].stdin);
        assert.equal(captured.spawns[0]!.cwd, tests[0].cwd);
        assert.equal(captured.spawns[0]!.env.LEIA_TEST_ID, tests[0].tests.test[0]!.id);
        assert.equal(captured.spawns[0]!.env.LEIA_TEST_NUMBER, tests[0].tests.test[0]!.number);
        assert.equal(captured.spawns[0]!.env.LEIA_TEST_STAGE, tests[0].tests.test[0]!.section);
        assert.deepEqual(fromVm(captured.debug[0]![3]), {
          args: tests[0].tests.test[0]!.args,
          commands: tests[0].tests.test[0]!.command,
          shell: tests[0].tests.test[0]!.shell,
          stdin: tests[0].stdin,
        });
      }
    });
  });
  it('should generate equivalent scenario bodies for CommonJS and ESM', () => {
    const commonjsTests = getTests();
    const esmTests = getTests();
    esmTests[0].destination = path.join(tempDir, 'equivalent.leia.mjs');
    esmTests[0].moduleFormat = 'esm';
    generate(commonjsTests);
    generate(esmTests);

    const commonjsSource = fs.readFileSync(commonjsTests[0].destination, 'utf8');
    const esmSource = fs.readFileSync(esmTests[0].destination, 'utf8');
    const bodyStart = `describe(${JSON.stringify('mock')}`;
    assert.equal(
      commonjsSource.slice(commonjsSource.indexOf(bodyStart)),
      esmSource.slice(esmSource.indexOf(bodyStart)),
    );
  });
  it('should reject unsupported generated module formats', () => {
    const tests = getTests();
    tests[0].moduleFormat = 'amd';
    assert.throws(
      () => generate(tests),
      (error: Error) => error.message.includes('Cannot generate unsupported module format "amd".'),
    );
  });
  it('should reject invalid retry metadata before rendering', () => {
    const tests = getTests();
    Object.assign(tests[0], { retry: 'three' });
    assert.throws(
      () => generate(tests),
      (error: Error) => error.message.includes('--retry must be an integer between 0 and'),
    );
  });
  it('should reject source-form arguments instead of interpolating them', () => {
    const tests = getTests();
    Object.assign(tests[0].tests.test[0]!, { args: `['${tests[0].tests.test[0]!.script}']` });
    assert.throws(
      () => generate(tests),
      (error: Error) => error.message.includes('tests.test[0].args" must be an array of strings'),
    );
  });
});
