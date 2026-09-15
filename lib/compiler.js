'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Bun loads TypeScript in development. Node uses the emitted ESM compiler.
const source = path.join(__dirname, '..', 'app', 'lib', 'compiler.ts');
module.exports =
  typeof globalThis.Bun !== 'undefined' && fs.existsSync(source)
    ? require(source)
    : require('../dist/lib/compiler.js');
