# Markdown compiler contract

The strict TypeScript ESM compiler lives in `lib/`; `compiler.ts` is its entrypoint.
Discovery, Markdown reading, normalization, validation, rendering, and file emission are separate
steps. The typed CLI and Mocha runner share these modules directly; Node callers select the ESM or CommonJS artifact through the package export map.

## Intermediate representation

`compiler-types.ts` defines the two boundaries:

| Type               | Produced by                                                        | Contract                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MarkdownDocument` | `readMarkdown(files)`                                              | File name and ordered top-level code blocks and level-one/two headings, before scenario normalization.                                               |
| `Harness`          | `normalizeMarkdown(documents, options)` or `parse(files, options)` | First title, dependency paths, working directory, destination, retry/stdin settings, one concrete module format, and scenario buckets.               |
| `Scenario`         | Normalization                                                      | Ordered description strings, normalized command bytes, shell and argument array, script path, skip flag, file identifier, role, and per-role number. |
| `GeneratedHarness` | `compileHarness(harness, options)`                                 | Validated scenarios, destination, and rendered source, without filesystem writes.                                                                    |

`Harness.tests` contains optional `setup`, `test`, `cleanup`, and `invalid` buckets. Repeated
sections append to the same bucket and numbering restarts at one for each role. Invalid sections
remain visible in the IR but are excluded from generation. The compatibility-shaped objects remain
usable by the existing synchronous `Leia.find()`, `parse()`, and `generate()` methods.

Generation validates incoming JavaScript data at runtime as well as accepting the typed IR.
Descriptions must contain a string; arguments must be strings in an array, not JavaScript source.
Retry, scenario numbers, stdin, paths, identifiers, and shell metadata are validated before rendering.
`generate()` validates and renders the entire batch before writing scripts or harnesses. Filesystem
errors during emission still propagate; emission is not a transactional filesystem operation.

## Preserved behavior

- Discovery retains glob ordering, ignores, realpath deduplication, and directory exclusion.
- The pinned Markdown lexer owns Markdown syntax, including its treatment of malformed fences.
  Only top-level code blocks and level-one/two headings participate. Deeper headings do not end a section.
- The first level-one title wins. Header prefixes are case-sensitive; setup wins over test, then
  cleanup. Code before any section is ignored. Empty test sections are retained; documents without
  a test section produce no harness. A test section without a title now reports a focused error
  instead of returning incomplete metadata that fails later during generation.
- Description comments are removed from commands. Lines are trimmed, backslash continuations folded,
  and remaining lines joined with the host newline. PowerShell receives its existing stop-on-error
  prefix. Only the normalized command exactly equal to `skip` sets the skip flag.
- Once normalized, command bytes are opaque: script writing does not escape or reinterpret them.
  JavaScript metadata uses JSON serialization with explicit U+2028/U+2029 escaping. Quotes,
  backticks, backslashes, substitutions, and shell variables are never template expressions.
- Module format is resolved from the invocation directory, not the Markdown directory. Only the
  nearest `package.json` participates in `auto`; malformed or unreadable packages fail explicitly.
  Destinations retain `.leia.cjs` or `.leia.mjs`. Both formats render the same scenario body.
- Shell scripts retain mode `0755`. Runtime retries, setup/test/cleanup order, stdin, environment
  metadata, and CommonJS dependency loading inside ESM harnesses retain the 1.x contract.

The renderer is TypeScript, not executable doT templates. `GenerateOptions` exposes `moduleFormat`
and the legacy `strip` option (default false when options are omitted). Whitespace stripping applies
only to static template text, never interpolated command content. Arbitrary doT compiler settings
and replacement definition directories are not compiler extension points.

## Development entrypoints and verification

Bun loads `lib/compiler.ts` directly. Node loads `dist/esm/lib/compiler.js` or `dist/cjs/lib/compiler.cjs`, so run `bun run build`
before using `node dist/esm/bin/leia.js` or the package API in a source checkout. `bun run test`
loads the source directly without a build. Compiler APIs remain synchronous. Generated harnesses load the typed runtime via `runtimePath`
(source on Bun, matching ESM or CommonJS artifact on Node), replacing the former `cltPath` dependency field.

`test/parse-baseline.json` and the two harness `*-baseline.json` files were captured from the
approved `2.x` implementation at `19a4a18`. The optimizer updates fixture paths and generated comments; command bytes and lifecycle assertions remain locked. The lifecycle port deliberately updates the runtime
dependency field and harness snapshots to delegate process execution to `runScenario`; command
bytes, ordering, environment metadata, and assertions remain intact. Tests compare the complete parser IR
(with repository/temp paths and host newlines normalized) and complete rendered bytes. Harness fixture lines are JSON-encoded to retain significant trailing
spaces and final newlines without introducing whitespace errors in the repository. The harness
fixture covers setup, ordinary tests, skip, cleanup, and shell-significant command content.
The existing compatibility assertions now live in TypeScript specs under `test/` and exercise
the source directly. Moved Markdown fixtures retain their bytes; parser snapshots update only their
source/cwd paths and path-derived destination hashes. Build checks also exercise discovery,
parsing, and rendering after removing TypeScript sources from the isolated copy.

Canonical lint, typecheck, unit, and build checks run locally. Executable Leia, shell, module-format,
and operating-system scenario matrices remain CI-owned. The [public package entrypoints](../README.md#module) expose the compiler and individual stages;
installed-tarball checks verify both JavaScript formats and their declarations.
