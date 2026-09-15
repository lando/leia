import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { executionTarget } from '../tooling/utils/execution-target.ts';
import type * as LibCliModule from '../lib/cli.ts';
import type * as LibCompilerModule from '../lib/compiler.ts';
import type * as LibExecuteModule from '../lib/execute.ts';
import type * as LibFindModule from '../lib/find.ts';
import type * as LibGenerateModule from '../lib/generate.ts';
import type * as LibLeiaModule from '../lib/leia.ts';
import type * as LibModuleFormatModule from '../lib/module-format.ts';
import type * as LibNumericOptionModule from '../lib/numeric-option.ts';
import type * as LibParseModule from '../lib/parse.ts';
import type * as LibPresentationModule from '../lib/presentation.ts';
import type * as LibRunModule from '../lib/run.ts';
import type * as LibRuntimeModule from '../lib/runtime.ts';
import type * as LibShellModule from '../lib/shell.ts';
import type * as UtilsNormalizeCommandModule from '../utils/normalize-command.ts';
import type * as UtilsParseNonNegativeIntegerModule from '../utils/parse-non-negative-integer.ts';
import type * as UtilsProcessErrorModule from '../utils/process-error.ts';
import type * as UtilsProcessTreeModule from '../utils/process-tree.ts';
import type * as UtilsRuntimeLayoutModule from '../utils/runtime-layout.ts';

interface Subjects {
  'lib/cli': typeof LibCliModule;
  'lib/compiler': typeof LibCompilerModule;
  'lib/execute': typeof LibExecuteModule;
  'lib/find': typeof LibFindModule;
  'lib/generate': typeof LibGenerateModule;
  'lib/leia': typeof LibLeiaModule;
  'lib/module-format': typeof LibModuleFormatModule;
  'lib/numeric-option': typeof LibNumericOptionModule;
  'lib/parse': typeof LibParseModule;
  'lib/presentation': typeof LibPresentationModule;
  'lib/run': typeof LibRunModule;
  'lib/runtime': typeof LibRuntimeModule;
  'lib/shell': typeof LibShellModule;
  'utils/normalize-command': typeof UtilsNormalizeCommandModule;
  'utils/parse-non-negative-integer': typeof UtilsParseNonNegativeIntegerModule;
  'utils/process-error': typeof UtilsProcessErrorModule;
  'utils/process-tree': typeof UtilsProcessTreeModule;
  'utils/runtime-layout': typeof UtilsRuntimeLayoutModule;
}

const loadCommonJS = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
export const target = executionTarget(process.env.LEIA_RUNTIME ?? 'source', root);
export const subjectPath = (module: string): string =>
  path.join(target.directory, `${module}.${target.extension}`);
export const loadSubject = async <Module extends keyof Subjects>(
  module: Module,
): Promise<Subjects[Module]> => {
  const filename = subjectPath(module);
  return target.name === 'cjs'
    ? (loadCommonJS(filename) as Subjects[Module])
    : ((await import(pathToFileURL(filename).href)) as Subjects[Module]);
};
