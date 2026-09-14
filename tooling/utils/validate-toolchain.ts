export default function validateToolchain(
  expected: string,
  packageManager: unknown,
  runtime: string,
): void {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(expected)) {
    throw new Error('.bun-version must contain one exact Bun version.');
  }
  if (packageManager !== `bun@${expected}`) {
    throw new Error(`package.json#packageManager must match .bun-version: bun@${expected}.`);
  }
  if (runtime !== expected) {
    throw new Error(`Use Bun ${expected}, pinned by .bun-version; found ${runtime}.`);
  }
}
