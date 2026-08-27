'use strict';

const fs = require('fs');
const path = require('path');

const MODULE_FORMATS = ['auto', 'commonjs', 'esm'];

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
module.exports = (moduleFormat = 'auto', cwd = process.cwd()) => {
  if (!MODULE_FORMATS.includes(moduleFormat)) {
    throw new Error(`Unsupported module format "${moduleFormat}". Expected one of: ${MODULE_FORMATS.join(', ')}.`);
  }

  if (moduleFormat !== 'auto') return moduleFormat;

  let directory = path.resolve(cwd);
  while (true) {
    const packageFile = path.join(directory, 'package.json');
    let source;

    try {
      source = fs.readFileSync(packageFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Could not read nearest package.json at ${packageFile}: ${error.message}`, {cause: error});
      }
    }

    if (source !== undefined) {
      try {
        const packageData = JSON.parse(source);
        return packageData?.type === 'module' ? 'esm' : 'commonjs';
      } catch (error) {
        throw new Error(`Could not parse nearest package.json at ${packageFile}: ${error.message}`, {cause: error});
      }
    }

    const parent = path.dirname(directory);
    if (parent === directory) return 'commonjs';
    directory = parent;
  }
};

module.exports.formats = MODULE_FORMATS;
