# Leia Example Guidance

This file applies to `examples/**`. Markdown scenarios are executable Leia specifications consumed
by CI, and package files or other static inputs beside them are live fixtures.

## Scenario Style

- Prefer behavior-focused `# should` labels and keep each block focused on one observable contract.
- Treat each blank-line-separated Leia block as a separate script. Do not rely on shell variables,
  functions, or working-directory changes persisting between blocks.
- Keep commands directly beneath their behavior label and separate tests with one blank line.
- Prefer direct commands and semantic output assertions over hidden repository-specific checkers.
- Keep setup minimal and cleanup limited to behavior under test or state that would contaminate
  another scenario.

## Scenario And Fixture Ownership

- Add coverage to the narrowest existing example that owns the behavior. Add a directory when the
  scenario needs a distinct package scope, incompatible setup, or independent CI identity.
- Keep scenario-owned Markdown, `package.json`, static inputs, and helpers together. Do not add a
  generic `fixtures/` wrapper inside an already self-contained scenario directory.
- Prefer checked-in deterministic inputs over commands that recreate the same files on every run.
- Store runtime scratch data beneath the scenario's CI-provided temporary directory, not as fixture
  material.

## Module-Format Examples

- The package files beneath `format-examples/` intentionally define CommonJS, ESM, untyped, and
  nearest-nested package scopes for `auto` detection. They are test inputs, not generated harness
  workarounds.
- Invoke each automatic-format scenario from its own directory. Leia resolves `auto` from the
  invocation directory, not from the Markdown source path.
- Keep explicit CommonJS and ESM override coverage in the Linux module-format workflow and automatic
  detection in the existing operating-system matrix.
- Do not add a CommonJS `package.json` merely to protect generated output. Explicit `.leia.cjs` and
  `.leia.mjs` extensions own that boundary now.

## Generator Boundaries

- Leia writes each executable block to a separate script; keep scenario behavior valid under that
  execution model.
- Keep coverage for valid template-sensitive shell syntax, including literal backticks, braced
  variables, command substitutions, octal escapes, and numeric backreferences.
- Keep package-scope and cross-platform scenario execution in CI by default. Do not run Leia
  examples locally unless operational validation is explicitly requested.
