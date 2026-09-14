#!/usr/bin/env bun

import { build, watchBuild } from '../lib/build.ts';
import { checkToolchain, repositoryRoot } from '../lib/toolchain.ts';

await checkToolchain(repositoryRoot);
if (process.argv.includes('--watch')) await watchBuild(repositoryRoot);
else await build(repositoryRoot);
