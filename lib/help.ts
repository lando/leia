import { getShell } from './shell.ts';
import { createStyles, type Styles } from './presentation.ts';

const option = (
  styles: Styles,
  signature: string,
  description: string,
  fallback?: string,
): string => {
  const line = `  ${signature.padEnd(42)} ${description}`;
  if (fallback === undefined) return line;
  return line.length + fallback.length + 1 <= 100
    ? `${line} ${styles.dim(fallback)}`
    : `${line}\n${' '.repeat(45)}${styles.dim(fallback)}`;
};

export const helpText = (styles: Styles = createStyles(process.stdout, process.env)): string => {
  const section = styles.accent;
  const optional = styles.dim('[options]');
  return [
    styles.bold('Leia'),
    'Run fenced Markdown examples as Mocha tests.',
    '',
    section('Usage'),
    `  leia <files...> ${optional}`,
    '',
    section('Options'),
    option(
      styles,
      '-c, --cleanup-header <names...>',
      'match cleanup section headings',
      '[default: Clean,Tear,Burn]',
    ),
    option(styles, '-i, --ignore <patterns...>', 'ignore matching files'),
    option(styles, '-r, --retry <count>', 'retry each failed test', '[default: 1]'),
    option(
      styles,
      '-s, --setup-header <names...>',
      'match setup section headings',
      '[default: Start,Setup,This is the dawning]',
    ),
    option(
      styles,
      '-t, --test-header <names...>',
      'match test section headings',
      '[default: Test,Validat,Verif]',
    ),
    option(styles, '-v, --version', 'report the current Leia version'),
    option(styles, '--debug[=<namespace>]', 'enable debug output'),
    option(styles, '--help', 'show help'),
    option(
      styles,
      '--module-format <auto|commonjs|esm>',
      'select generated module format',
      '[default: auto]',
    ),
    option(
      styles,
      '--shell <bash|cmd|powershell|pwsh|sh|zsh>',
      'run tests with a shell',
      `[default: ${getShell().binary}]`,
    ),
    option(styles, '--stdin', 'attach the invoking input stream'),
    option(
      styles,
      '--timeout <seconds>',
      'set the per-test deadline; 0 disables it',
      '[default: 1800]',
    ),
    '',
    section('Examples'),
    '  leia README.md',
    '  leia "docs/**/*.md" --ignore "docs/archive/**"',
    '  leia README.md --retry 2 --timeout 60',
    '  leia README.md --module-format esm',
    '',
  ].join('\n');
};
