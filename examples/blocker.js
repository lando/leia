#!/usr/bin/env node

'use strict';

const tty = require('tty');

if (!tty.isatty(0)) process.exit(1);
