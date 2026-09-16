import { getShell } from './shell.ts';
import { createStyles, type Styles } from './presentation.ts';

const option = (
  styles: Styles,
  signature: string,
  description: string,
  fallback?: string,
): string => {
  const [flags = '', value] = signature.split(/ (?=<)/);
  const label = styles.bold(flags) + (value ? ` ${styles.dim(value)}` : '');
  const padding = ' '.repeat(Math.max(0, 26 - signature.length));
  const line = `  ${label}${padding}  ${description}`;
  return fallback === undefined ? line : `${line} ${styles.dim(fallback)}`;
};

export const helpText = (styles: Styles = createStyles(process.stdout, process.env)): string => {
  const section = styles.accent;
  const optional = styles.dim('[options]');
  return [
    `usage: ${styles.dim('[LEIA_*...]')} ${styles.bold('leia')} <files...> ${optional}`,
    '',
    'runs fenced markdown examples as mocha tests',
    '',
    section('options'),
    option(styles, '-c <names...>', 'sets cleanup heading prefixes', '[default: Clean,Tear,Burn]'),
    option(styles, '-i, --ignore <patterns...>', 'excludes matching files'),
    option(styles, '-r, --retry <count>', 'sets retries per failed command', '[default: 1]'),
    option(
      styles,
      '-s <names...>',
      'sets setup heading prefixes',
      '[default: Start,Setup,This is the dawning]',
    ),
    option(styles, '-t <names...>', 'sets test heading prefixes', '[default: Test,Validat,Verif]'),
    option(styles, '--module-format <format>', 'selects auto, commonjs, or esm', '[default: auto]'),
    option(styles, '--shell <name>', 'selects the test shell', `[default: ${getShell().binary}]`),
    option(styles, '--stdin', 'attaches the invoking input stream'),
    option(styles, '--timeout <seconds>', 'sets the deadline; 0 disables it', '[default: 1800]'),
    option(styles, '-v, --version', 'shows the current version'),
    option(styles, '--debug', 'enables all debug output'),
    option(styles, '--help', 'shows this help'),
    '',
    section('examples'),
    `  ${styles.bold('leia')} README.md`,
    `  ${styles.bold('leia')} "docs/**/*.md" --ignore "docs/archive/**"`,
    `  ${styles.bold('leia')} README.md --retry 2 --timeout 60`,
    `  ${styles.bold('leia')} README.md --module-format esm`,
    '',
    section('environment variables'),
    ...[
      ['LEIA_CLEANUP_HEADER', '-c'],
      ['LEIA_SETUP_HEADER', '-s'],
      ['LEIA_TEST_HEADER', '-t'],
      ['LEIA_IGNORE', '--ignore'],
      ['LEIA_RETRY', '--retry'],
      ['LEIA_TIMEOUT', '--timeout'],
      ['LEIA_SHELL', '--shell'],
      ['LEIA_MODULE_FORMAT', '--module-format'],
      ['LEIA_STDIN', '--stdin'],
      ['LEIA_DEBUG', '--debug'],
    ].map(([name, flag]) => option(styles, name!, `same as ${flag}`)),
    '',
  ].join('\n');
};
