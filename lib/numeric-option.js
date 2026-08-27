'use strict';

const MAX_RETRY = Number.MAX_SAFE_INTEGER;
const MAX_TIMEOUT_SECONDS = Math.floor(0x7FFFFFFF / 1000);

const parseNonNegativeInteger = (value, option, max) => {
  const integer = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

  if (!Number.isSafeInteger(integer) || integer < 0 || integer > max) {
    throw new Error(`${option} must be an integer between 0 and ${max}.`);
  }

  return integer;
};

module.exports = {
  MAX_RETRY,
  MAX_TIMEOUT_SECONDS,
  retry: (value) => parseNonNegativeInteger(value, '--retry', MAX_RETRY),
  timeout: (value) => parseNonNegativeInteger(value, '--timeout', MAX_TIMEOUT_SECONDS),
};
