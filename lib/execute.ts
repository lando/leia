import { isatty } from 'node:tty';
import { spawn, spawnSync } from 'node:child_process';

import { processTree } from '../utils/process-tree.ts';

export interface ProcessRequest {
  shell: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdin: 'pipe' | 'inherit';
  timeout?: number;
  signal?: AbortSignal;
}

export interface ProcessResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error: Error | null;
  timedOut: boolean;
  cancelled: boolean;
}

/** settle only after stream closure and cancellation escalation, never on the exit event alone. */
export const execute = (request: ProcessRequest): Promise<ProcessResult> =>
  new Promise((resolve) => {
    const result: ProcessResult = {
      code: null,
      signal: null,
      stdout: '',
      stderr: '',
      error: null,
      timedOut: false,
      cancelled: request.signal?.aborted ?? false,
    };
    if (result.cancelled) {
      resolve(result);
      return;
    }
    const grouped = process.platform !== 'win32' && !(request.stdin === 'inherit' && isatty(0));
    const child = spawn(request.shell, request.args, {
      cwd: request.cwd,
      env: request.env ?? process.env,
      stdio: [request.stdin, 'pipe', 'pipe'],
      // interactive children must retain the terminal's session; other posix children get a group.
      detached: grouped,
      windowsHide: true,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let escalation: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    let stopping = false;
    let terminated = false;
    const finish = (): void => {
      if (!closed || (stopping && !terminated)) return;
      clearTimeout(timer);
      clearTimeout(escalation);
      request.signal?.removeEventListener('abort', cancel);
      resolve(result);
    };
    let targets: number[] = [];
    const terminate = (signal: NodeJS.Signals): void => {
      for (const pid of targets) {
        try {
          process.kill(pid, signal);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') result.error ??= error as Error;
        }
      }
    };
    const stop = (): void => {
      if (stopping) return;
      stopping = true;
      clearTimeout(timer);
      if (!child.pid) {
        terminated = true;
        finish();
        return;
      }
      if (process.platform === 'win32') {
        // windows has no posix process groups; taskkill owns recursive termination there.
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
        killer.once('error', (error) => {
          result.error ??= error;
          child.kill();
        });
        killer.once('close', () => {
          terminated = true;
          finish();
        });
      } else {
        if (grouped) targets = [-child.pid];
        else {
          // never signal the foreground group: it includes leia and potentially its caller.
          const snapshot = spawnSync('ps', ['-A', '-o', 'pid=,ppid='], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 1000,
          });
          if (snapshot.error || snapshot.status !== 0)
            result.error ??=
              snapshot.error ??
              new Error(`Cannot inspect terminal process tree: ${snapshot.stderr}`);
          targets = processTree(snapshot.stdout ?? '', child.pid);
        }
        terminate('SIGTERM');
        escalation = setTimeout(() => {
          terminate('SIGKILL');
          terminated = true;
          finish();
        }, 250);
      }
    };
    const cancel = (): void => {
      result.cancelled = true;
      stop();
    };
    child.stdout!.setEncoding('utf8').on('data', (data: string) => {
      result.stdout += data;
    });
    child.stderr!.setEncoding('utf8').on('data', (data: string) => {
      result.stderr += data;
    });
    child.once('error', (error) => {
      result.error = error;
    });
    child.once('close', (code, signal) => {
      result.code = code;
      result.signal = signal;
      closed = true;
      finish();
    });
    // an unattached stdin must produce eof, not leave commands waiting on an unwritten pipe.
    child.stdin?.on('error', () => {}).end();
    request.signal?.addEventListener('abort', cancel, { once: true });
    if (request.signal?.aborted) cancel();
    if (!stopping && request.timeout)
      timer = setTimeout(() => {
        result.timedOut = true;
        stop();
      }, request.timeout);
  });
