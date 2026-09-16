#!/usr/bin/env bun

import { checkDistribution } from '../lib/distribution.ts';
import { checkToolchain, repositoryRoot } from '../lib/toolchain.ts';

await checkToolchain(repositoryRoot);
await checkDistribution(repositoryRoot);
process.stderr.write('Distribution is complete and current.\n');
