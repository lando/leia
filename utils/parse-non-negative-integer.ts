export const parseNonNegativeInteger = (value: unknown, option: string, max: number): number => {
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
