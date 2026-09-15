export const MAX_RETRY = Number.MAX_SAFE_INTEGER;
export const MAX_TIMEOUT_SECONDS = Math.floor(0x7fffffff / 1000);

const parseNonNegativeInteger = (value: unknown, option: string, max: number): number => {
  const integer = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (
    typeof integer !== 'number' ||
    !Number.isSafeInteger(integer) ||
    integer < 0 ||
    integer > max
  ) {
    throw new Error(`${option} must be an integer between 0 and ${max}.`);
  }
  return integer;
};

export const retry = (value: unknown): number =>
  parseNonNegativeInteger(value, '--retry', MAX_RETRY);
export const timeout = (value: unknown): number =>
  parseNonNegativeInteger(value, '--timeout', MAX_TIMEOUT_SECONDS);
