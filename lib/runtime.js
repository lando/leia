'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Package adapters remain until final artifact wiring; all behavior lives in typed ESM.
const source = path.join(__dirname, '..', 'app', 'lib', 'api.ts');
module.exports =
  typeof globalThis.Bun !== 'undefined' && fs.existsSync(source)
    ? require(source)
    : require('../dist/lib/api.js');
