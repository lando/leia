import fs from 'node:fs';

import createDebug from 'debug';

import { debugNamespace, parseCLI } from './cli.ts';
import { helpText } from './help.ts';
import { createPresentation } from './presentation.ts';
import { runtimeLayout } from '../utils/runtime-layout.ts';

export const runCLI = async (argv = process.argv.slice(2)): Promise<void> => {
  const presentation = createPresentation();
  let failure = {
    operation: 'parse command options',
    next: 'Run leia --help to review supported options and values.',
  };
  try {
    const namespace = debugNamespace(argv, process.env);
    if (namespace !== undefined) createDebug.enable(namespace);
    const debug = createDebug('leia:cli');
    debug('starting default command execution');
    const options = parseCLI(argv);
    if (options.version) {
      failure = {
        operation: 'read package metadata',
        next: 'Reinstall Leia so package.json is present and readable.',
      };
      const metadata = JSON.parse(
        fs.readFileSync(runtimeLayout(import.meta.url).packageFile, 'utf8'),
      ) as { name: string; version: string };
      process.stdout.write(
        `${metadata.name}/${metadata.version} ${process.platform}-${process.arch} node-${process.version}\n`,
      );
      return;
    }
    if (options.help || !options.tests.length) {
      process.stdout.write(helpText(presentation.styles));
      return;
    }
    if (options.spawn) presentation.warn('--spawn');
    if (options.splitFile) presentation.warn('--split-file');
    // Load orchestration after debug initialization and the cheap help/version paths.
    const { Leia } = await import('./leia.ts');
    const { exitCode } = await import('./run.ts');
    const leia = new Leia();
    failure = {
      operation: 'resolve the generated module format',
      next: 'Check the nearest package.json or pass --module-format explicitly.',
    };
    options.moduleFormat = leia.resolveModuleFormat(options.moduleFormat, process.cwd());
    debug('leia parsed args and flags into options: %o', options);
    failure = {
      operation: 'discover Markdown files',
      next: 'Check the file patterns, ignored paths, and read permissions, then retry.',
    };
    const files = leia.find(options.tests, options.ignore);
    debug('detected possible test source files: %o', files.join(', '));
    failure = {
      operation: 'parse Markdown scenarios',
      next: 'Check the Markdown headings and fenced test blocks, then retry.',
    };
    const sources = leia.parse(files, options);
    debug('detected valid test sources %o', sources.map((source) => source.file).join(', '));
    failure = {
      operation: 'generate test files',
      next: 'Check the scenario content and output-directory permissions, then retry.',
    };
    const tests = leia.generate(sources);
    debug('generated leia tests to %o', tests.join(', '));
    presentation.start(sources.length, tests.length);
    failure = {
      operation: 'load generated tests',
      next: 'Review the generated-test diagnostic, correct the scenario, then retry.',
    };
    const mocha = await leia.runAsync(tests, options);
    failure = {
      operation: 'run generated tests',
      next: 'Review the test diagnostic, correct the scenario or command, then retry.',
    };
    await new Promise<void>((resolve) =>
      mocha.run((failures) => {
        debug('tests completed with %o failures', failures);
        const code = exitCode(mocha, failures);
        presentation.complete(tests.length, failures, code);
        process.exitCode = code;
        resolve();
      }),
    );
  } catch (error) {
    presentation.error(error, failure.operation, failure.next);
    process.exitCode = 1;
  }
};
