import path from 'node:path';

import createDebug from 'debug';
import Mocha from 'mocha';

import { Lifecycle, type ScenarioContext } from './runtime.ts';
import { timeout as validateTimeout } from './numeric-option.ts';

const debug = createDebug('leia:run');
/** options shared by the synchronous and asynchronous mocha loaders. */
export interface RunOptions {
  timeout?: number | string;
  reporter?: string;
}

const createRunner = (tests: string[], options: RunOptions = {}): Mocha => {
  const timeout = validateTimeout(options.timeout ?? 1800) * 1000;
  if (!tests.length) throw new Error('You must pass in some tests!');
  const mocha = new Mocha({ timeout, reporter: options.reporter });
  const lifecycle = new Lifecycle();
  (mocha.suite.ctx as ScenarioContext).leiaLifecycle = lifecycle;
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
  const listeners = signals.map((signal) => () => lifecycle.interrupt(signal));
  mocha.suite.beforeAll('attach Leia signal handlers', () => {
    signals.forEach((signal, index) => process.on(signal, listeners[index]!));
  });
  mocha.suite.afterAll('detach Leia signal handlers', () => {
    signals.forEach((signal, index) => process.removeListener(signal, listeners[index]!));
  });
  for (const test of tests) {
    debug('adding %o to the test runner with timeout %o', test, `${timeout}ms`);
    mocha.addFile(test);
  }
  return mocha;
};

/**
 * creates a mocha runner for commonjs harnesses.
 *
 * @param tests generated commonjs harness paths.
 * @param options per-test timeout in seconds and an optional mocha reporter name.
 * @returns a configured mocha runner. call its `run()` method to execute the suite.
 * @throws when no harnesses are provided or an esm harness is passed.
 */
export const run = (tests: string[], options?: RunOptions): Mocha => {
  if (tests.some((test) => path.extname(test) === '.mjs'))
    throw new Error('ESM harnesses require the asynchronous runAsync() API.');
  return createRunner(tests, options);
};

/**
 * creates a mocha runner and loads commonjs or esm harnesses asynchronously.
 *
 * @param tests generated harness paths.
 * @param options per-test timeout in seconds and an optional mocha reporter name.
 * @returns a loaded mocha runner. call its `run()` method to execute the suite.
 * @throws when no harnesses are provided or a harness cannot be loaded.
 */
export const runAsync = async (tests: string[], options?: RunOptions): Promise<Mocha> => {
  const mocha = createRunner(tests, options);
  await mocha.loadFilesAsync();
  return mocha;
};

/**
 * maps mocha failures and a caught leia lifecycle signal to a process exit code.
 *
 * @param mocha the runner returned by `run()` or `runAsync()`.
 * @param failures the failure count reported by mocha.
 * @returns `0` for success, `1` for failures, or `129`, `130`, or `143` for a caught signal.
 */
export const exitCode = (mocha: Mocha, failures: number): number => {
  const signal = (mocha.suite.ctx as ScenarioContext).leiaLifecycle?.signal;
  if (signal)
    return { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }[signal as 'SIGHUP' | 'SIGINT' | 'SIGTERM'];
  return failures ? 1 : 0;
};
