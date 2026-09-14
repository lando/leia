#!/usr/bin/env bun

import { checkBuild } from '../lib/check-build.ts';
import { checkToolchain, repositoryRoot } from '../lib/toolchain.ts';

await checkToolchain(repositoryRoot);
await checkBuild(repositoryRoot);
