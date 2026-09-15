#!/usr/bin/env bun

import { checkToolchain, repositoryRoot } from '../lib/toolchain.ts';

await checkToolchain(repositoryRoot);
