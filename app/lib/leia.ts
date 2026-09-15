import { find } from './find.ts';
import { generate } from './generate.ts';
import { parse } from './parse.ts';
import { resolveModuleFormat } from './module-format.ts';
import { run, runAsync } from './run.ts';

/** Typed orchestration surface shared by the CLI and compatibility adapters. */
export class Leia {
  find = find;
  generate = generate;
  parse = parse;
  resolveModuleFormat = resolveModuleFormat;
  run = run;
  runAsync = runAsync;
}
