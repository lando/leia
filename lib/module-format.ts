import fs from 'node:fs';
import path from 'node:path';

import type { ModuleFormat } from './compiler-types.ts';

export const formats = ['auto', 'commonjs', 'esm'];

/**
 * Resolves Leia's generated harness module format.
 *
 * Auto detection walks from the invocation directory to the nearest package.json. A package is ESM only when its
 * type is explicitly "module"; all other readable package scopes and a missing package default to CommonJS.
 *
 * @param {String} [moduleFormat=auto] Requested auto, commonjs, or esm format.
 * @param {String} [cwd=process.cwd()] Initial invocation working directory used for auto detection.
 * @return {String} The resolved commonjs or esm format.
 * @throws {Error} When the format is unsupported or the nearest package.json cannot be read or parsed.
 */
export const resolveModuleFormat = (
  moduleFormat: string = 'auto',
  cwd: string = process.cwd(),
): ModuleFormat => {
  if (!formats.includes(moduleFormat)) {
    throw new Error(
      `Unsupported module format "${moduleFormat}". Expected one of: ${formats.join(', ')}.`,
    );
  }

  if (moduleFormat === 'commonjs' || moduleFormat === 'esm') return moduleFormat;

  let directory = path.resolve(cwd);
  while (true) {
    const packageFile = path.join(directory, 'package.json');
    let source: string | undefined;

    try {
      source = fs.readFileSync(packageFile, 'utf8');
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw new Error(
          `Could not read nearest package.json at ${packageFile}: ${error instanceof Error ? error.message : String(error)}`,
          {
            cause: error,
          },
        );
      }
    }

    if (source !== undefined) {
      try {
        const packageData: unknown = JSON.parse(source);
        return packageData !== null &&
          typeof packageData === 'object' &&
          'type' in packageData &&
          packageData.type === 'module'
          ? 'esm'
          : 'commonjs';
      } catch (error) {
        throw new Error(
          `Could not parse nearest package.json at ${packageFile}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }

    const parent = path.dirname(directory);
    if (parent === directory) return 'commonjs';
    directory = parent;
  }
};

export type { ModuleFormat } from './compiler-types.ts';
