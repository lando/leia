#!/usr/bin/env bun

import { checkPackage } from '../lib/check-package.ts';
import { checkToolchain, repositoryRoot } from '../lib/toolchain.ts';

const args = process.argv.slice(2);
const destination = args
  .find((arg) => arg.startsWith('--pack-destination='))
  ?.split('=')
  .slice(1)
  .join('=');
if (args.some((arg) => arg !== '--scenarios' && !arg.startsWith('--pack-destination=')))
  throw new Error('Usage: check:package [--scenarios] [--pack-destination=directory]');
await checkToolchain(repositoryRoot);
await checkPackage(repositoryRoot, destination, args.includes('--scenarios'));
