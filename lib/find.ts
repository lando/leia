import createDebug from 'debug';
import glob from 'glob';

import { strings } from './compiler-validation.ts';

const debug = createDebug('leia:find');

/**
 * Finds scenario files from glob patterns.
 *
 * Results preserve pattern order, exclude directories, resolve to real paths, and remove
 * duplicates. Ignore patterns are passed to the same glob implementation.
 *
 * @param patterns Glob patterns to scan.
 * @param ignore Glob patterns to exclude.
 * @returns Absolute paths for the discovered scenario files.
 * @throws A `TypeError` when either argument is not an array of strings.
 */
export const find = (patterns: string[], ignore: string[] = []): string[] => {
  strings(patterns, 'patterns');
  strings(ignore, 'ignore');
  debug('scanning patterns %o and ignoring %o', patterns, ignore);
  return [
    ...new Set(
      patterns.flatMap((pattern) => glob.sync(pattern, { realpath: true, nodir: true, ignore })),
    ),
  ];
};
