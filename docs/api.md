# Programmatic API

This guide covers Leia's supported JavaScript and TypeScript entrypoints for application authors.
Start with the [README](../README.md) for installation and CLI onboarding.

## ESM

The default import is the Leia constructor. Automatic or ESM harnesses must use the asynchronous
loader:

<!-- leia-example:api-esm -->

```js
import Leia from '@lando/leia';

const leia = new Leia();
const files = leia.find(['quickstart.md']);
const sources = leia.parse(files, { moduleFormat: 'esm' });
const harnesses = leia.generate(sources);
const runner = await leia.runAsync(harnesses);

runner.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
```

Named `Leia` and default `Leia` imports refer to the same constructor.

## CommonJS

`require('@lando/leia')` preserves the 1.x constructor shape. When the generated format is known to
be CommonJS, the synchronous loader remains available:

<!-- leia-example:api-commonjs -->

```js
const Leia = require('@lando/leia');

const leia = new Leia();
const files = leia.find(['quickstart.md']);
const sources = leia.parse(files, { moduleFormat: 'commonjs' });
const harnesses = leia.generate(sources);
const runner = leia.run(harnesses);

runner.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
```

CommonJS may also call `runAsync()` for either harness format. Calling `run()` with an ESM
`.leia.mjs` harness throws a focused error instead of attempting a partial synchronous load.

## Pipeline

The constructor exposes the common compiler and runner sequence:

1. `find(patterns, ignore?)` discovers files, preserves glob order, removes realpath duplicates,
   and excludes directories.
2. `parse(files, options?)` reads Markdown and produces normalized harness metadata.
3. `generate(harnesses, options?)` validates the complete batch, writes command scripts and
   generated harnesses, and returns the harness paths.
4. `run(harnesses, options?)` creates a Mocha runner for CommonJS harnesses.
5. `await runAsync(harnesses, options?)` creates the runner and loads CommonJS or ESM files.
6. Call the returned Mocha instance's `.run(callback)` to execute the suite.

`run()` and `runAsync()` accept `timeout` in seconds and a Mocha `reporter` name. The CLI handles
exit status for command-line use. Programmatic consumers decide their own process policy; the
exported `exitCode(runner, failures)` helper preserves Leia's signal-aware `0`, `1`, `129`,
`130`, and `143` mapping.

Parsing options include `setupHeader`, `testHeader`, `cleanupHeader`, `shell`, `retry`, `stdin`,
and `moduleFormat`. Generation accepts a concrete `moduleFormat` and the retained `strip` option.
See [Using Leia](./using-leia.md) for scenario, shell, and format behavior and the
[compiler contract](./compiler.md) for the typed intermediate representation.

## Public entrypoints

Every JavaScript entrypoint has separate ESM and CommonJS artifacts plus TypeScript declarations.
CommonJS subpaths expose named properties, such as
`const { find } = require('@lando/leia/find')`.

| Entry point                 | Public exports                                                   |
| --------------------------- | ---------------------------------------------------------------- |
| `@lando/leia`               | Default/named `Leia` constructor and its instance methods        |
| `@lando/leia/find`          | `find`                                                           |
| `@lando/leia/parse`         | `parse`, `readMarkdown`, `normalizeMarkdown`, `normalizeCommand` |
| `@lando/leia/generate`      | `generate`, `compileHarness`                                     |
| `@lando/leia/run`           | `run`, `runAsync`, `exitCode`                                    |
| `@lando/leia/shell`         | `getShell`                                                       |
| `@lando/leia/module-format` | `resolveModuleFormat`, `formats`                                 |
| `@lando/leia/compiler`      | Discovery, parsing, generation, shell, and module-format exports |
| `@lando/leia/package.json`  | Package metadata                                                 |

Only these package paths are supported. Imports through `lib/`, `utils/`, `dist/`, runtime
internals, or CLI implementation files are private and rejected by the package export map. The
`leia` binary is the supported command-line surface.

## TypeScript

Types are selected by the same import or require condition as runtime code. Public function
entrypoints export their option and result types, including `ParseOptions`, `Harness`,
`GenerateOptions`, `GeneratedHarness`, `RunOptions`, `Shell`, and `ModuleFormat`. The compiler
entrypoint also exports the shared representation types.

Use `node16` or `nodenext` module and module-resolution settings so TypeScript follows the package
conditions. Leia publishes the declaration dependency exposed by its Mocha return type; consumers do
not need Bun or Leia's development dependencies.

The packed-package check compiles strict `.mts` and `.cts` consumers under both resolution modes,
with automatic global types disabled.
