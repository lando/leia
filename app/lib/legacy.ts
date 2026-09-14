import { createRequire } from 'node:module';

const loadLegacy = createRequire(import.meta.url);

// Both app/ and dist/ keep this module two levels below the legacy package root.
export const runLegacyCLI = loadLegacy('../../cli/bootstrap.js') as () => Promise<unknown>;
