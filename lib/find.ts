import createDebug from 'debug';
import glob from 'glob';

import { strings } from './compiler-validation.ts';

const debug = createDebug('leia:find');

/**
 * finds scenario files from glob patterns.
 *
 * results preserve pattern order, exclude directories, resolve to real paths, and remove
 * duplicates. ignore patterns are passed to the same glob implementation.
 *
 * @param patterns glob patterns to scan.
 * @param ignore glob patterns to exclude.
 * @returns absolute paths for the discovered scenario files.
 * @throws a `TypeError` when either argument is not an array of strings.
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
