import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// This is the only untyped production boundary until the CLI/runner port lands.
export const runLegacyCLI = require('../cli/bootstrap.js') as () => Promise<unknown>;
