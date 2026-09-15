import { parseNonNegativeInteger } from '../utils/parse-non-negative-integer.ts';

export const MAX_RETRY = Number.MAX_SAFE_INTEGER;
export const MAX_TIMEOUT_SECONDS = Math.floor(0x7fffffff / 1000);

export const retry = (value: unknown): number =>
  parseNonNegativeInteger(value, '--retry', MAX_RETRY);
export const timeout = (value: unknown): number =>
  parseNonNegativeInteger(value, '--timeout', MAX_TIMEOUT_SECONDS);
