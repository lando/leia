import type { ModuleFormat } from './compiler-types.ts';

/** Every string here is a validated JavaScript literal, not raw metadata. */
export interface RenderScenario {
  args: string;
  command: string;
  describe: string;
  id: string;
  number: string;
  section: string;
  shell: string;
  skip: boolean;
}

export interface RenderHarness {
  chaiPath: string;
  runtimePath: string;
  cwd: string;
  debugPath: string;
  id: string;
  retry: string;
  stdin: string;
  tests: Record<string, RenderScenario[]>;
  version: string;
}

type Text = (parts: TemplateStringsArray, ...values: string[]) => string;

// Apply the legacy strip option only to static template text, never command or metadata bytes.
const templateText =
  (strip: boolean): Text =>
  (parts, ...values) =>
    parts
      .map((part, index) => {
        const literal = strip
          ? part
              .replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g, ' ')
              .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, '')
          : part;
        return literal + (values[index] ?? '');
      })
      .join('');

const renderScenario = (
  it: RenderHarness,
  test: RenderScenario,
  text: Text,
): string => text`  it(${test.describe}, function() {
    process.chdir(${it.cwd});
    process.env.LEIA_TEST_ID = ${test.id};
    process.env.LEIA_TEST_NUMBER = ${test.number};
    process.env.LEIA_TEST_RETRY = this.test.currentRetry();
    process.env.LEIA_TEST_STAGE = ${test.section};
    ${
      test.skip
        ? text`this.skip();`
        : text`
    const data = {shell: ${test.shell}, args: ${test.args}, commands: ${test.command}, stdin: ${it.stdin}};
    debug('running test %s from %s using %o', ${it.id}, ${it.cwd}, data);
    return runScenario(this, {shell: ${test.shell}, args: ${test.args}, cwd: ${it.cwd}, stdin: ${it.stdin}}, ${test.section});`
    }
  });
`;

export const renderHarness = (it: RenderHarness, format: ModuleFormat, strip = false): string => {
  const text = templateText(strip);
  const header = text`/*
 * This file was automatically generated, editing it manually would be foolish
 *
 * See https://github.com/lando/leia for more
 * information on how all this magic works
 *
 */

// Set some helpful envvars so we know these are leia tezts
process.env.LEIA = 'true';
process.env.LEIA_ENVIRONMENT = 'true';
process.env.LEIA_TEST_RUNNING = 'true';
process.env.LEIA_VERSION = ${it.version};

// Set legacy envars
// These are DERECATED and will eventually be removed!!!
process.env.LEIA_PARSER_RUNNING = 'true';
process.env.LEIA_PARSER_VERSION = ${it.version};
process.env.LEIA_PARSER_ID = ${it.id};
process.env.LEIA_PARSER_RETRY = ${it.retry};
`;
  const dependencies =
    format === 'esm'
      ? text`
import {createRequire} from 'node:module';

// Load absolute dependency paths through Node's cross-platform module loader.
const require = createRequire(import.meta.url);
const chai = require(${it.chaiPath});
const {runScenario} = require(${it.runtimePath});
const debug = require(${it.debugPath})('leia:test:' + ${it.id});
const path = require('path');
chai.should();

/* eslint-disable max-len */
`
      : text`
// We need these deps to run our tezts
const chai = require(${it.chaiPath});
const {runScenario} = require(${it.runtimePath});
const debug = require(${it.debugPath})('leia:test:' + ${it.id});
const path = require('path');
chai.should();

/* eslint-disable max-len */
`;
  const body = text`describe(${it.id}, function() {
  this.retries(${it.retry});
${(it.tests.setup ?? [])
  .map(
    (test) => text`
  // These are tests we need to run to get the app into a state to test
  // @todo: It would be nice to eventually get these into mocha before hooks
  // so they run before every test
${renderScenario(it, test, text)}`,
  )
  .join('')}
  // These tests are the main event
  // @todo: It would be nice to eventually get these into mocha after hooks
  // so they run after every test${(it.tests.test ?? [])
    .map(
      (test) => text`
${renderScenario(it, test, text)}`,
    )
    .join('')}${(it.tests.cleanup ?? [])
    .map(
      (test) => text`
  // These are tests we need to run to get the app into a state to test
  // @todo: It would be nice to eventually get these into mocha before hooks
  // so they run before every test
${renderScenario(it, test, text)}`,
    )
    .join('')}});
`;
  return header + dependencies + body + text`\n`;
};
