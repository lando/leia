import fs from 'node:fs';

import chalk from 'chalk';
import createDebug from 'debug';

import { debugNamespace, parseCLI } from './cli.ts';
import { helpText } from './help.ts';
import { runtimeLayout } from '../utils/runtime-layout.ts';

export const runCLI = async (argv = process.argv.slice(2)): Promise<void> => {
  try {
    const namespace = debugNamespace(argv, process.env);
    if (namespace !== undefined) createDebug.enable(namespace);
    const debug = createDebug('leia:cli');
    debug('starting default command execution');
    const options = parseCLI(argv);
    if (options.version) {
      const metadata = JSON.parse(
        fs.readFileSync(runtimeLayout(import.meta.url).packageFile, 'utf8'),
      ) as { name: string; version: string };
      process.stdout.write(
        `${metadata.name}/${metadata.version} ${process.platform}-${process.arch} node-${process.version}\n`,
      );
      return;
    }
    if (options.help || !options.tests.length) {
      process.stdout.write(helpText());
      return;
    }
    // Load orchestration after debug initialization and the cheap help/version paths.
    const { Leia } = await import('./leia.ts');
    const { exitCode } = await import('./run.ts');
    const leia = new Leia();
    options.moduleFormat = leia.resolveModuleFormat(options.moduleFormat, process.cwd());
    debug('leia parsed args and flags into options: %o', options);
    const files = leia.find(options.tests, options.ignore);
    debug('detected possible test source files: %o', files.join(', '));
    const sources = leia.parse(files, options);
    debug('detected valid test sources %o', sources.map((source) => source.file).join(', '));
    const tests = leia.generate(sources);
    debug('generated leia tests to %o', tests.join(', '));
    const mocha = await leia.runAsync(tests, options);
    await new Promise<void>((resolve) =>
      mocha.run((failures) => {
        debug('tests completed with %o failures', failures);
        process.exitCode = exitCode(mocha, failures);
        resolve();
      }),
    );
  } catch (error) {
    process.stderr.write(
      chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}\n`),
    );
    process.exitCode = 1;
  }
};
