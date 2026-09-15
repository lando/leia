import os from 'node:os';

import detectNewline from 'detect-newline';

/** Markdown normalization happens here, never during code generation. */
export const normalizeCommand = (command: string, shell: string): string => {
  // Marked normalizes line endings; the fallback also handles single-line/empty code blocks.
  const newline = detectNewline(command) ?? '\n';
  const trimmed = command
    .split(newline)
    .map((line) => line.trim())
    .join(newline);
  const lines = trimmed
    .replace(new RegExp(`\\\\${newline}`, 'g'), ' ')
    .split(newline)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.trim());
  if (shell === 'pwsh' || shell === 'powershell') lines.unshift('$ErrorActionPreference = "Stop"');
  return lines.join(os.EOL);
};
