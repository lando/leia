import { find } from './find.ts';
import { generate } from './generate.ts';
import { parse } from './parse.ts';
import { resolveModuleFormat } from './module-format.ts';
import { run, runAsync } from './run.ts';

/**
 * Coordinates Leia's discovery, parsing, generation, and execution stages.
 *
 * The default and named ESM exports refer to this constructor. CommonJS `require('@lando/leia')`
 * returns the same constructor directly.
 *
 * @example ESM
 * <!-- leia-example:api-esm -->
 * ```js
 * import Leia from '@lando/leia';
 *
 * const leia = new Leia();
 * const files = leia.find(['quickstart.md']);
 * const sources = leia.parse(files, { moduleFormat: 'esm' });
 * const harnesses = leia.generate(sources);
 * const runner = await leia.runAsync(harnesses);
 *
 * runner.run((failures) => {
 *   process.exitCode = failures ? 1 : 0;
 * });
 * ```
 *
 * @example CommonJS
 * <!-- leia-example:api-commonjs -->
 * ```js
 * const Leia = require('@lando/leia');
 *
 * const leia = new Leia();
 * const files = leia.find(['quickstart.md']);
 * const sources = leia.parse(files, { moduleFormat: 'commonjs' });
 * const harnesses = leia.generate(sources);
 * const runner = leia.run(harnesses);
 *
 * runner.run((failures) => {
 *   process.exitCode = failures ? 1 : 0;
 * });
 * ```
 */
export class Leia {
  find = find;
  generate = generate;
  parse = parse;
  resolveModuleFormat = resolveModuleFormat;
  run: typeof run = run;
  runAsync: typeof runAsync = runAsync;
}

// Preserve the constructor returned by Node 24 require() without a CommonJS adapter.
export { Leia as default, Leia as 'module.exports' };
