import path from 'node:path';
import createDebug from 'debug';
import Mocha from 'mocha';
import { timeout as validateTimeout } from './numeric-option.ts';
import { Lifecycle, type ScenarioContext } from './runtime.ts';

const debug = createDebug('leia:run');
export interface RunOptions {
  timeout?: number | string;
  reporter?: string;
}

const createRunner = (tests: string[], options: RunOptions = {}): Mocha => {
  const timeout = validateTimeout(options.timeout ?? 1800) * 1000;
  if (!tests.length) throw new Error('You must pass in some tests!');
  const mocha = new Mocha({ timeout });
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

export const run = (tests: string[], options?: RunOptions): Mocha => {
  if (tests.some((test) => path.extname(test) === '.mjs'))
    throw new Error('ESM harnesses require the asynchronous runAsync() API.');
  return createRunner(tests, options);
};

export const runAsync = async (tests: string[], options?: RunOptions): Promise<Mocha> => {
  const mocha = createRunner(tests, options);
  await mocha.loadFilesAsync();
  return mocha;
};

export const exitCode = (mocha: Mocha, failures: number): number => {
  const signal = (mocha.suite.ctx as ScenarioContext).leiaLifecycle?.signal;
  if (signal)
    return { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }[signal as 'SIGHUP' | 'SIGINT' | 'SIGTERM'];
  return failures ? 1 : 0;
};
