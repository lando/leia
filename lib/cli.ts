import { getShell } from './shell.ts';
import type { ParseOptions } from './compiler-types.ts';
import { retry, timeout } from './numeric-option.ts';

export interface CLIOptions extends ParseOptions {
  tests: string[];
  ignore: string[];
  timeout: number;
  debug: boolean;
  help: boolean;
  version: boolean;
  spawn: boolean;
  splitFile: boolean;
}

const aliases: Record<string, string> = {
  c: 'cleanup-header',
  i: 'ignore',
  r: 'retry',
  s: 'setup-header',
  t: 'test-header',
  v: 'version',
};
const multiple = new Set(['cleanup-header', 'setup-header', 'test-header', 'ignore']);
const booleans = new Set(['debug', 'help', 'version', 'stdin', 'spawn', 'split-file']);
const singles = new Set(['retry', 'timeout', 'shell', 'module-format']);

/** Preserve oclif's non-strict positional and greedy repeated-string flag behavior. */
export const parseCLI = (argv: string[]): CLIOptions => {
  const options: CLIOptions = {
    tests: [],
    ignore: [],
    timeout: 1800,
    retry: 1,
    shell: getShell().binary,
    moduleFormat: 'auto',
    setupHeader: ['Start', 'Setup', 'This is the dawning'],
    testHeader: ['Test', 'Validat', 'Verif'],
    cleanupHeader: ['Clean', 'Tear', 'Burn'],
    stdin: false,
    debug: false,
    help: false,
    version: false,
    spawn: false,
    splitFile: false,
  };
  const values = new Map<string, string[]>();
  const args = [...argv];
  while (args.length) {
    const argument = args.shift()!;
    if (argument === '--') {
      options.tests.push(...args);
      break;
    }
    let name: string | undefined;
    let inline: string | undefined;
    if (argument.startsWith('--')) {
      const equals = argument.indexOf('=');
      name = argument.slice(2, equals < 0 ? undefined : equals);
      if (equals >= 0) inline = argument.slice(equals + 1);
    } else if (argument.startsWith('-')) {
      name = aliases[argument[1]!];
      if (name && argument.length > 2) inline = argument.slice(2).replace(/^=/, '');
    }
    if (!name || (!booleans.has(name) && !multiple.has(name) && !singles.has(name))) {
      options.tests.push(argument);
      continue;
    }
    if (booleans.has(name)) {
      if (name === 'split-file') options.splitFile = true;
      else options[name as 'stdin' | 'debug' | 'help' | 'version' | 'spawn'] = true;
      if (name === 'help' || name === 'version') return options;
      if (inline !== undefined && name !== 'debug') args.unshift(inline);
      continue;
    }
    const value = inline ?? args.shift();
    if (value === undefined) throw new Error(`Flag --${name} expects a value`);
    if (multiple.has(name)) {
      const collected = values.get(name) ?? [];
      collected.push(value);
      while (args[0] !== undefined && !args[0].startsWith('-')) collected.push(args.shift()!);
      values.set(name, collected);
    } else if (name === 'retry') options.retry = retry(value);
    else if (name === 'timeout') options.timeout = timeout(value);
    else {
      const allowed =
        name === 'shell'
          ? ['bash', 'cmd', 'powershell', 'pwsh', 'sh', 'zsh']
          : ['auto', 'commonjs', 'esm'];
      if (!allowed.includes(value))
        throw new Error(
          `Expected --${name}=${value} to be one of: ${allowed.join(', ')}\nSee more help with --help`,
        );
      if (name === 'shell') options.shell = value;
      else options.moduleFormat = value as ParseOptions['moduleFormat'] & string;
    }
  }
  for (const [flag, key] of [
    ['setup-header', 'setupHeader'],
    ['test-header', 'testHeader'],
    ['cleanup-header', 'cleanupHeader'],
  ] as const) {
    const headers = values.get(flag);
    if (headers) options[key] = headers.length === 1 ? headers[0]!.split(',') : headers;
  }
  options.ignore = values.get('ignore') ?? [];
  return options;
};

export const debugNamespace = (
  argv: string[],
  environment: NodeJS.ProcessEnv,
): string | undefined => {
  if (environment.DEBUG) return undefined;
  const option = argv.find((value) => value === '--debug' || value.startsWith('--debug='));
  return option === '--debug' ? '*' : option?.slice('--debug='.length);
};
