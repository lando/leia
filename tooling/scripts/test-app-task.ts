#!/usr/bin/env bun

import { repositoryRoot } from '../lib/toolchain.ts';
import { testApp } from '../lib/test-app.ts';

const args = process.argv.slice(2);
if (args.length && (args.length !== 1 || args[0] !== '--coverage'))
  throw new Error('Expected no arguments or --coverage');
process.exitCode = await testApp(repositoryRoot, args[0] === '--coverage');
