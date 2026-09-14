import { builtinModules } from 'node:module';

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const restrictedBuiltins = builtinModules
  .filter((name) => !name.startsWith('_') && !name.startsWith('node:'))
  .map((name) => ({ name, message: `Use node:${name} instead of bare builtin imports.` }));

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/.temp/**',
    '**/temp/**',
    '**/cache/**',
    '**/.tmp/**',
    '**/*.leia.js',
    '**/*.leia.cjs',
    '**/*.leia.mjs',
    'leia.readme.js',
    'templates/**',
  ]),
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}', 'bin/leia'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'warn', 'no-debugger': 'error', 'no-duplicate-imports': 'error' },
  },
  {
    files: ['**/*.{mjs,ts,tsx}'],
    languageOptions: { sourceType: 'module' },
    rules: {
      'no-restricted-imports': ['error', { paths: restrictedBuiltins }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Use ESM imports in module files.',
        },
        {
          selector: "AssignmentExpression[left.object.name='module'][left.property.name='exports']",
          message: 'Use ESM exports in module files.',
        },
        {
          selector: "AssignmentExpression[left.object.name='exports']",
          message: 'Use ESM exports in module files.',
        },
      ],
    },
  },
  // Legacy scopes and the intentionally invalid ESM harness fixture stay CommonJS-shaped.
  {
    files: [
      'bin/leia',
      'cli/**/*.js',
      'lib/**/*.js',
      'test/**/*.js',
      'examples/**/*.js',
      '**/*.cjs',
    ],
    languageOptions: { sourceType: 'commonjs' },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { Bun: 'readonly' } },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  {
    files: ['**/test/**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: { globals: globals.mocha },
  },
  prettierConfig,
]);
