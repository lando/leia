import { runLegacyCLI } from './legacy.ts';

/** Execute the CLI through the compatibility implementation during migration. */
export const runCLI = async (): Promise<void> => {
  await runLegacyCLI();
};
