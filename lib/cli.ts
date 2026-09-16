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
const booleans = new Set([
  'debug',
  'no-debug',
  'help',
  'version',
  'stdin',
  'no-stdin',
  'spawn',
  'split-file',
]);
const singles = new Set(['retry', 'timeout', 'shell', 'module-format']);

/** Preserve oclif's non-strict positional and greedy repeated-string flag behavior. */
export const parseCLI = (argv: string[], environment: NodeJS.ProcessEnv = {}): CLIOptions => {
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
  const explicitBooleans = new Set<string>();
  const environmentValue = (name: string): string | undefined =>
    environment[`LEIA_${name.replaceAll('-', '_').toUpperCase()}`] || undefined;
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
      const negative = name === 'no-debug' || name === 'no-stdin';
      if ((name === 'debug' || negative) && inline !== undefined)
        throw new Error(`Flag --${name} does not accept a value.`);
      if (negative) name = name.slice(3);
      explicitBooleans.add(name);
      if (name === 'split-file') options.splitFile = true;
      else options[name as 'stdin' | 'debug' | 'help' | 'version' | 'spawn'] = !negative;
      if (name === 'help' || name === 'version') break;
      if (inline !== undefined) args.unshift(inline);
      continue;
    }
    const value = inline ?? args.shift();
    if (value === undefined) throw new Error(`Flag --${name} expects a value`);
    if (multiple.has(name)) {
      const collected = values.get(name) ?? [];
      collected.push(value);
      while (args[0] !== undefined && !args[0].startsWith('-')) collected.push(args.shift()!);
      values.set(name, collected);
    } else values.set(name, [value]);
  }
  for (const name of singles) {
    const value = values.get(name)?.[0] ?? environmentValue(name);
    if (value === undefined) continue;
    if (name === 'retry') options.retry = retry(value);
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
  for (const name of ['stdin', 'debug'] as const) {
    if (explicitBooleans.has(name)) continue;
    const value = environmentValue(name);
    if (value === undefined) continue;
    if (!['1', 'true', '0', 'false'].includes(value))
      throw new Error(`LEIA_${name.toUpperCase()} must be 1, true, 0, or false.`);
    options[name] = value === '1' || value === 'true';
  }

  for (const [flag, key] of [
    ['setup-header', 'setupHeader'],
    ['test-header', 'testHeader'],
    ['cleanup-header', 'cleanupHeader'],
  ] as const) {
    const headers =
      values.get(flag) ??
      environmentValue(flag)
        ?.split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    if (headers) options[key] = headers.length === 1 ? headers[0]!.split(',') : headers;
  }
  options.ignore =
    values.get('ignore') ??
    environmentValue('ignore')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ??
    [];
  return options;
};
