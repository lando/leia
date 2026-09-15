import type { ProcessResult } from '../lib/execute.ts';

export const processError = (result: ProcessResult): Error | undefined => {
  if (!result.error && result.code === 0 && !result.signal && !result.timedOut && !result.cancelled)
    return undefined;
  const code = result.timedOut
    ? 'ETIMEDOUT'
    : result.cancelled
      ? 'ABORT_ERR'
      : (result.signal ?? (result.error as NodeJS.ErrnoException | null)?.code ?? result.code);
  return new Error(
    [
      `CODE: ${code}`,
      `STDOUT: ${result.stdout}`,
      `STDERR: ${result.stderr}`,
      ...(result.error ? [result.error.message] : []),
    ].join('\n'),
  );
};
