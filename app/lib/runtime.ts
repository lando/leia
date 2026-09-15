import type Mocha from 'mocha';
import { execute, processError, type ProcessRequest } from './execute.ts';

export class Lifecycle {
  readonly commands = new AbortController();
  readonly cleanup = new AbortController();
  signal: NodeJS.Signals | undefined;
  activeStage: string | undefined;

  interrupt(signal: NodeJS.Signals): void {
    if (this.signal || this.activeStage === 'cleanup') this.cleanup.abort();
    this.signal ??= signal;
    this.commands.abort();
  }
}

export interface ScenarioContext extends Mocha.Context {
  leiaLifecycle?: Lifecycle;
}

/** The process deadline owns termination; Mocha must not start a retry while the child survives. */
export const runScenario = async (
  context: ScenarioContext,
  request: Omit<ProcessRequest, 'signal' | 'timeout'>,
  stage: string,
): Promise<void> => {
  const lifecycle = context.leiaLifecycle;
  const signal = stage === 'cleanup' ? lifecycle?.cleanup.signal : lifecycle?.commands.signal;
  if (signal?.aborted) context.skip();
  const timeout = context.timeout();
  context.timeout(0);
  if (lifecycle) lifecycle.activeStage = stage;
  try {
    const result = await execute({ ...request, timeout, ...(signal ? { signal } : {}) });
    if (result.cancelled) context.retries(0);
    const error = processError(result);
    if (error) throw error;
  } finally {
    if (lifecycle) lifecycle.activeStage = undefined;
    context.timeout(timeout);
  }
};
