import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import createDebug from 'debug';
import detectNewline from 'detect-newline';
import hash from 'object-hash';
import lodash from 'lodash';
import { marked } from 'marked';

import { boolean, strings } from './compiler-validation.ts';
import { getShell } from './shell.ts';
import type {
  Harness,
  MarkdownDocument,
  MarkdownElement,
  ParseOptions,
  Scenario,
  SectionRole,
  Shell,
} from './compiler-types.ts';
import { normalizeCommand } from '../utils/normalize-command.ts';
import { resolveModuleFormat } from './module-format.ts';
import { runtimeLayout } from '../utils/runtime-layout.ts';
import { retry as validateRetry } from './numeric-option.ts';

export { normalizeCommand } from '../utils/normalize-command.ts';

const debug = createDebug('leia:parse');
const { root: repositoryRoot, runtimePath } = runtimeLayout(import.meta.url);
const normalizePath = (file: string): string => file.split(path.sep).join('/');

const findClosestModule = (dependency: string): string => {
  let directory = path.resolve(repositoryRoot);
  while (true) {
    const candidate = path.join(directory, 'node_modules', dependency);
    if (fs.existsSync(candidate)) return normalizePath(candidate);
    const parent = path.dirname(directory);
    if (parent === directory)
      throw new Error(
        `Cannot compile Markdown: dependency "${dependency}" was not found from ${repositoryRoot}.`,
      );
    directory = parent;
  }
};

/**
 * reads the markdown tokens used by leia's scenario compiler.
 *
 * only level-one and level-two headings plus top-level fenced code blocks are retained. repeated
 * file paths are combined into one document.
 *
 * @param files markdown files to read synchronously.
 * @returns ordered compiler documents.
 * @throws a `TypeError` when `files` is not an array of strings.
 */
export const readMarkdown = (files: string[]): MarkdownDocument[] => {
  strings(files, 'files');
  const documents = new Map<string, MarkdownDocument>();
  for (const file of files) {
    const document = documents.get(file) ?? { file, elements: [] };
    for (const token of marked.lexer(fs.readFileSync(file, 'utf8'))) {
      if (token.type === 'code') document.elements.push({ type: 'code', text: token.text });
      else if (token.type === 'heading' && (token.depth === 1 || token.depth === 2)) {
        document.elements.push({ type: 'heading', depth: token.depth, text: token.text });
      }
    }
    documents.set(file, document);
  }
  return [...documents.values()];
};

const normalizeCode = (
  text: string,
  file: string,
  shell: Shell,
): Omit<Scenario, 'id' | 'number' | 'section'>[] => {
  const newline = detectNewline(text) ?? '\n';
  return text.split(`${newline}${newline}`).map((test) => {
    const script = normalizePath(
      path.join(os.tmpdir(), 'leia', hash(file), `${hash(test)}${shell.extension}`),
    );
    const command = normalizeCommand(test, shell.name);
    return {
      args: shell.args.map((arg) => arg.replace('{0}', script)),
      shell: normalizePath(shell.binary),
      command,
      skip: command === 'skip',
      script,
      describe: test
        .split(newline)
        .filter((line) => line.startsWith('#'))
        .map((line) => lodash.lowerCase(lodash.trim(lodash.trimStart(line, '#')))),
    };
  });
};

/**
 * converts compiler documents into generated-harness metadata.
 *
 * header prefixes are case-sensitive. documents without a matching test section are omitted;
 * documents with tests require a level-one title.
 *
 * @param documents documents returned by `readMarkdown()`.
 * @param options scenario headers, shell, retry, stdin, and module-format settings.
 * @returns normalized harness metadata ready for generation.
 * @throws when options are invalid or a test document has no level-one title.
 */
export const normalizeMarkdown = (
  documents: MarkdownDocument[],
  options: ParseOptions = {},
): Harness[] => {
  const {
    cleanupHeader = ['Clean'],
    moduleFormat = 'auto',
    retry = 3,
    setupHeader = ['Setup'],
    shell,
    stdin = false,
    testHeader = ['Test'],
  } = options;
  strings(cleanupHeader, 'cleanupHeader');
  strings(setupHeader, 'setupHeader');
  strings(testHeader, 'testHeader');
  boolean(stdin, 'stdin');
  if (shell !== undefined && typeof shell !== 'string')
    throw new TypeError('Compiler option "shell" must be a string.');
  const resolvedFormat = resolveModuleFormat(moduleFormat, process.cwd());
  const resolvedRetry = validateRetry(retry);
  const role = (text: string): SectionRole => {
    if (setupHeader.some((header) => text.startsWith(header))) return 'setup';
    if (testHeader.some((header) => text.startsWith(header))) return 'test';
    if (cleanupHeader.some((header) => text.startsWith(header))) return 'cleanup';
    return 'invalid';
  };
  const harnesses: Harness[] = [];
  for (const { file, elements } of documents) {
    const tests: Harness['tests'] = {};
    let section: SectionRole | undefined;
    let title: Extract<MarkdownElement, { type: 'heading' }> | undefined;
    for (const element of elements) {
      if (element.type === 'heading') {
        if (element.depth === 1) title ??= element;
        else {
          section = role(element.text);
          tests[section] ??= [];
        }
      } else {
        // even orphan code blocks historically resolve the selected shell.
        const scenarios = normalizeCode(element.text, file, getShell(shell));
        if (section !== undefined) {
          const bucket = (tests[section] ??= []);
          for (const scenario of scenarios)
            bucket.push({
              ...scenario,
              id: path.basename(file, '.md'),
              number: bucket.length + 1,
              section,
            });
        }
      }
    }
    if (!tests.test) continue;
    if (!title)
      throw new Error(
        `Cannot compile Markdown "${file}": a level-one title is required for test sections.`,
      );
    const id = lodash.kebabCase(title.text);
    const packageData: unknown = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
    );
    if (
      !packageData ||
      typeof packageData !== 'object' ||
      !('version' in packageData) ||
      typeof packageData.version !== 'string'
    ) {
      throw new Error('Cannot compile Markdown: package.json must contain a string version.');
    }
    const harness: Harness = {
      file,
      id,
      chaiPath: findClosestModule('@lando/chai'),
      runtimePath: normalizePath(runtimePath),
      debugPath: findClosestModule('debug'),
      destination: path.resolve(
        os.tmpdir(),
        'leia',
        hash(file),
        `${id}.leia.${resolvedFormat === 'esm' ? 'mjs' : 'cjs'}`,
      ),
      moduleFormat: resolvedFormat,
      retry: resolvedRetry,
      cwd: normalizePath(path.dirname(path.resolve(file))),
      stdin: stdin ? 'inherit' : 'pipe',
      text: title.text,
      type: 'title',
      version: packageData.version,
      tests,
    };
    debug(
      'parsed %o and found these tests: %o',
      file,
      Object.fromEntries(Object.entries(tests).map(([key, value]) => [key, value.length])),
    );
    harnesses.push(harness);
  }
  return harnesses;
};

/**
 * reads and normalizes markdown scenario files.
 *
 * module format and retry options are validated before file i/o, including when `files` is empty.
 *
 * @param files markdown scenario paths.
 * @param options scenario headers, shell, retry, stdin, and module-format settings.
 * @returns normalized harness metadata ready for `generate()`.
 * @throws when options, markdown, or files are invalid.
 */
export const parse = (files: string[], options: ParseOptions = {}): Harness[] => {
  // resolve invocation options before i/o, including when no files match.
  const resolvedOptions = {
    ...options,
    moduleFormat: resolveModuleFormat(options.moduleFormat, process.cwd()),
    retry: validateRetry(options.retry === undefined ? 3 : options.retry),
  };
  return normalizeMarkdown(readMarkdown(files), resolvedOptions);
};

export type {
  ParseOptions,
  Harness,
  Scenario,
  MarkdownDocument,
  MarkdownElement,
} from './compiler-types.ts';
