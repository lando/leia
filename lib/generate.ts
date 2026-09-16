import fs from 'node:fs';
import path from 'node:path';

import createDebug from 'debug';

import { boolean, integer, record, sourceLiteral, string, strings } from './compiler-validation.ts';
import type { GenerateOptions, Scenario } from './compiler-types.ts';
import { renderHarness, type RenderHarness, type RenderScenario } from './render.ts';
import { retry } from './numeric-option.ts';

const debug = createDebug('leia:generate');

const prepareScenario = (value: unknown, section: string, index: number): Scenario => {
  const scenario = record(value, `tests.${section}[${index}]`);
  const field = (name: string): string => `tests.${section}[${index}].${name}`;
  const script = string(scenario.script, field('script'));
  if (!Array.isArray(scenario.describe) || typeof scenario.describe[0] !== 'string') {
    throw new TypeError(`Generated harness metadata "${field('describe')}" must contain a string.`);
  }
  return {
    script,
    describe: strings(scenario.describe, field('describe')),
    skip: boolean(scenario.skip, field('skip')),
    args: strings(scenario.args, field('args')),
    command: string(scenario.command, field('command')),
    id: string(scenario.id, field('id')),
    number: integer(scenario.number, field('number')),
    section: string(scenario.section, field('section')),
    shell: string(scenario.shell, field('shell')),
  };
};

const prepareRenderScenario = (scenario: Scenario): RenderScenario => ({
  args: sourceLiteral(scenario.args),
  command: sourceLiteral(scenario.command),
  describe: sourceLiteral(scenario.describe[0]!),
  id: sourceLiteral(scenario.id),
  number: sourceLiteral(scenario.number),
  section: sourceLiteral(scenario.section),
  shell: sourceLiteral(scenario.shell),
  skip: scenario.skip,
});

/** an in-memory generated harness before files are emitted. */
export interface GeneratedHarness {
  destination: string;
  source: string;
  scenarios: Scenario[];
}

/**
 * validates and renders one harness without writing files.
 *
 * @param value harness-shaped data from typescript or untyped javascript.
 * @param options concrete output format and optional static-template whitespace stripping.
 * @returns the destination, rendered source, and validated scenarios.
 * @throws a `TypeError` for malformed metadata or an `Error` for an unsupported module format.
 */
export const compileHarness = (
  value: unknown,
  options: GenerateOptions = { strip: false },
): GeneratedHarness => {
  const test = record(value, 'harness');
  const format = test.moduleFormat || options.moduleFormat || 'commonjs';
  if (format !== 'commonjs' && format !== 'esm')
    throw new Error(`Cannot generate unsupported module format "${String(format)}".`);
  const destination = string(test.destination, 'destination');
  const sections = record(test.tests, 'tests');
  const scenarios: Scenario[] = [];
  const tests: RenderHarness['tests'] = Object.create(null) as RenderHarness['tests'];
  for (const [section, values] of Object.entries(sections)) {
    if (section === 'invalid') continue;
    if (!Array.isArray(values))
      throw new TypeError(`Generated harness metadata "tests.${section}" must be an array.`);
    const prepared = values.map((scenario: unknown, index: number) =>
      prepareScenario(scenario, section, index),
    );
    scenarios.push(...prepared);
    tests[section] = prepared.map(prepareRenderScenario);
  }
  const stdin = string(test.stdin, 'stdin');
  if (stdin !== 'inherit' && stdin !== 'pipe')
    throw new TypeError('Generated harness metadata "stdin" must be "inherit" or "pipe".');
  const data: RenderHarness = {
    chaiPath: sourceLiteral(string(test.chaiPath, 'chaiPath')),
    runtimePath: sourceLiteral(string(test.runtimePath, 'runtimePath')),
    cwd: sourceLiteral(string(test.cwd, 'cwd')),
    debugPath: sourceLiteral(string(test.debugPath, 'debugPath')),
    id: sourceLiteral(string(test.id, 'id')),
    retry: sourceLiteral(retry(test.retry)),
    stdin: sourceLiteral(stdin),
    tests,
    version: sourceLiteral(string(test.version, 'version')),
  };
  const strip = options.strip === undefined ? true : boolean(options.strip, 'strip');
  return { destination, scenarios, source: renderHarness(data, format, strip) };
};

/**
 * validates a batch, then writes its command scripts and generated harnesses.
 *
 * every harness is rendered before any output is written. script files are executable; filesystem
 * errors during emission propagate to the caller.
 *
 * @param tests harness-shaped values, normally returned by `parse()`.
 * @param options concrete output format and optional static-template whitespace stripping.
 * @returns paths to the generated harnesses.
 * @throws when input metadata, output format, or filesystem operations are invalid.
 */
export const generate = (
  tests: unknown[],
  options: GenerateOptions = { strip: false },
): string[] => {
  if (!Array.isArray(tests)) throw new TypeError('Compiler input "tests" must be an array.');
  const outputs = tests.map((test) => compileHarness(test, options));
  for (const output of outputs) {
    fs.mkdirSync(path.dirname(output.destination), { recursive: true });
    for (const scenario of output.scenarios) {
      debug('generating script to %o and making it executable', scenario.script);
      fs.writeFileSync(scenario.script, scenario.command);
      fs.chmodSync(scenario.script, 0o755);
    }
    fs.writeFileSync(output.destination, output.source);
  }
  return outputs.map((output) => output.destination);
};

export type { GenerateOptions, Harness, Scenario } from './compiler-types.ts';
