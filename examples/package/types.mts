import Leia from '@lando/leia';
import { Leia as NamedLeia } from '@lando/leia';
import { find } from '@lando/leia/find';
import {
  parse,
  readMarkdown,
  normalizeMarkdown,
  normalizeCommand,
  type ParseOptions,
  type Harness,
} from '@lando/leia/parse';
import {
  generate,
  compileHarness,
  type GenerateOptions,
  type GeneratedHarness,
} from '@lando/leia/generate';
import { run, runAsync, exitCode, type RunOptions } from '@lando/leia/run';
import { getShell, type Shell } from '@lando/leia/shell';
import { formats, resolveModuleFormat, type ModuleFormat } from '@lando/leia/module-format';
import * as compiler from '@lando/leia/compiler';
import type metadata from '@lando/leia/package.json';

const options: ParseOptions = { moduleFormat: 'esm', retry: 0 };
const files: string[] = find(['input.scenario']);
const harnesses: Harness[] = parse(files, options);
const generation: GenerateOptions = { strip: false };
const compiled: GeneratedHarness = compileHarness(harnesses[0], generation);
const normalized: Harness[] = normalizeMarkdown(readMarkdown(files), options);
const command: string = normalizeCommand('echo hello', 'sh');
const shell: Shell = getShell('sh');
const format: ModuleFormat = resolveModuleFormat(formats[0]);
const generated: string[] = generate(harnesses, generation);
const runOptions: RunOptions = { timeout: 10 };
const runner = run(generated, runOptions);
runner.run((failures) => exitCode(runner, failures));
const asyncRunner = await runAsync(generated, runOptions);
asyncRunner.run((failures) => exitCode(asyncRunner, failures));
const leia: Leia = new Leia();
const named: NamedLeia = new NamedLeia();
void named;
const parsed: compiler.Harness[] = leia.parse(files, options);
const code: number = exitCode(leia.run(generated), 0);
const version: typeof metadata.version = 'typechecked';
void [compiled, normalized, command, shell, format, parsed, code, version, compiler.find(files)];
// @ts-expect-error Patterns must be strings, not a scalar.
find(42);
// @ts-expect-error Unsupported harness format.
parse(files, { moduleFormat: 'amd' });
// @ts-expect-error Internal paths are not public exports.
import { parse as internalParse } from '@lando/leia/lib/parse';
void internalParse;
