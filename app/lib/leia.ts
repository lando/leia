import { find } from './find.ts';
import { generate } from './generate.ts';
import { parse } from './parse.ts';
import { resolveModuleFormat } from './module-format.ts';
import { run, runAsync } from './run.ts';

/** Typed orchestration surface shared by the CLI and package entrypoint. */
export class Leia {
  find = find;
  generate = generate;
  parse = parse;
  resolveModuleFormat = resolveModuleFormat;
  run = run;
  runAsync = runAsync;
}

// Preserve the constructor returned by Node 24 require() without a CommonJS adapter.
export { Leia as default, Leia as 'module.exports' };
