export const record = (value: unknown, field: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Generated harness metadata "${field}" must be an object.`);
  }
  return value as Record<string, unknown>;
};

export const string = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new TypeError(`Generated harness metadata "${field}" must be a string.`);
  }
  return value;
};

export const strings = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value) || value.some((item: unknown) => typeof item !== 'string')) {
    throw new TypeError(`Generated harness metadata "${field}" must be an array of strings.`);
  }
  return value as string[];
};

export const integer = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(
      `Generated harness metadata "${field}" must be a non-negative safe integer.`,
    );
  }
  return value;
};

export const boolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new TypeError(`Generated harness metadata "${field}" must be a boolean.`);
  }
  return value;
};

/** Serialize values once; never interpret shell content as JavaScript source. */
export const sourceLiteral = (value: string | string[] | number): string =>
  JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
