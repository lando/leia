import chalk from 'chalk';

export const LANDO_PRIMARY = '#ed3f7a';

type ColorLevel = 0 | 1 | 2 | 3;

export interface OutputStream {
  isTTY?: boolean;
  write(value: string): unknown;
}

export interface PresentationOptions {
  environment?: NodeJS.ProcessEnv;
  stderr?: OutputStream;
  stdout?: OutputStream;
}

export interface Styles {
  accent(value: string): string;
  bold(value: string): string;
  dim(value: string): string;
  green(value: string): string;
  red(value: string): string;
  yellow(value: string): string;
}

const forceColorLevel = (value: string): ColorLevel => {
  if (value === '0' || value === 'false') return 0;
  if (value === '2') return 2;
  if (value === '3') return 3;
  return 1;
};

export const colorLevel = (stream: OutputStream, environment: NodeJS.ProcessEnv): ColorLevel => {
  if (environment.FORCE_COLOR !== undefined) return forceColorLevel(environment.FORCE_COLOR);
  if (environment.NO_COLOR !== undefined || environment.CI !== undefined || !stream.isTTY) return 0;
  return 3;
};

export const createStyles = (stream: OutputStream, environment: NodeJS.ProcessEnv): Styles => {
  const style = new chalk.Instance({ level: colorLevel(stream, environment) });
  return {
    accent: style.hex(LANDO_PRIMARY),
    bold: style.bold,
    dim: style.dim,
    green: style.green,
    red: style.red,
    yellow: style.yellow,
  };
};

const plural = (count: number, singular: string): string =>
  count === 1 ? singular : `${singular}s`;

const labeled = (label: string, message: string, style: (value: string) => string): string => {
  const indent = ' '.repeat(8);
  const [first = '', ...rest] = message.split('\n');
  return `${style(label.padEnd(7))} ${first}${rest.map((line) => `\n${indent}${line}`).join('')}\n`;
};

export const createPresentation = (options: PresentationOptions = {}) => {
  const environment = options.environment ?? process.env;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const output = createStyles(stdout, environment);
  const diagnostic = createStyles(stderr, environment);

  return {
    styles: output,
    start(sourceCount: number, testCount: number): void {
      stdout.write(
        labeled(
          'run',
          `${testCount} generated ${plural(testCount, 'test file')} from ${sourceCount} Markdown ${plural(sourceCount, 'source')}`,
          output.accent,
        ),
      );
    },
    complete(testCount: number, failures: number, code: number): void {
      const result = `${testCount} generated ${plural(testCount, 'test file')}; ${failures} ${plural(failures, 'failure')}`;
      if (code === 0) stdout.write(labeled('done', result, output.green));
      else {
        stdout.write(labeled(code === 1 ? 'failed' : 'stopped', result, output.red));
        stderr.write(
          labeled(
            'next',
            code === 1
              ? 'Review the failing test output above, then rerun Leia.'
              : `Resolve the interruption reported by exit code ${code}, then rerun Leia.`,
            diagnostic.dim,
          ),
        );
      }
    },
    warn(flag: '--spawn' | '--split-file'): void {
      stderr.write(
        labeled(
          'warn',
          `${flag} is retained for compatibility but no longer changes execution.`,
          diagnostic.yellow,
        ),
      );
      stderr.write(
        labeled('next', 'Remove the flag after every environment uses Leia 2.0.', diagnostic.dim),
      );
    },
    error(error: unknown, operation: string, next: string): void {
      const message = error instanceof Error ? error.message : String(error);
      stderr.write(labeled('error', `Could not ${operation}: ${message}`, diagnostic.red));
      stderr.write(labeled('next', next, diagnostic.dim));
    },
  };
};
