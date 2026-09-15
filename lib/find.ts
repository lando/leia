import createDebug from 'debug';
import glob from 'glob';

import { strings } from './compiler-validation.ts';

const debug = createDebug('leia:find');

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
