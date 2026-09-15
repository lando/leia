#!/usr/bin/env bun

import { repositoryRoot } from '../lib/toolchain.ts';
import { executionTarget } from '../utils/execution-target.ts';

const target = executionTarget(process.env.LEIA_RUNTIME ?? 'source', repositoryRoot);
const child = Bun.spawn(
  [
    target.executable,
    ...(target.name === 'source' ? ['--bun'] : []),
    'node_modules/mocha/bin/mocha.js',
    '--timeout',
    '5000',
    'test/*.spec.ts',
  ],
  { cwd: repositoryRoot, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' },
);
process.exitCode = await child.exited;
