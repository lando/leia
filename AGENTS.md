# Leia Repository Guidance

## Scope and ownership

- Leia compiles fenced Markdown scenarios into CommonJS or ESM Mocha harnesses and manages their
  execution and cleanup through a CLI and programmatic API.
- Root `bin/` owns the thin public launcher, `lib/` compiler and lifecycle orchestration, `utils/`
  independently testable functions, and flat `test/` their specs and fixtures. No `app/` or `src/` wrapper.
- `dev/` owns build, validation, and documentation helpers. They are not public CLI commands or
  installed runtime dependencies. `.github/workflows/` owns CI and release automation.
- Read `examples/AGENTS.md` before editing executable scenarios or their fixtures.

## Out of scope

- Leia is not a general task orchestrator, package manager, or replacement for Mocha or the shell.
- New runtimes, native binaries, and additional module formats require an explicit product decision.

## Branch and compatibility boundaries

- Target 2.0 PRs at `2.x` and bounded 1.x maintenance at `main`. Forward-port applicable fixes.
  Keep `main` as default until the approved 2.0 cutover.
- On `main`, preserve Node CommonJS implementation. Generated-harness format support does not
  authorize migrating Leia itself to ESM or dual-package output.
- On `2.x`, preserve root TypeScript ESM, Bun development/builds, and Node 24 ESM/CommonJS artifacts.
  Keep explicit `.cjs` helpers and scenario-owned module scopes.
- Resolve one harness format per invocation. `auto` uses the nearest `package.json` from the initial
  working directory. Emit `.leia.cjs` or `.leia.mjs` independently of temporary-directory scope.
- Preserve synchronous `run()` for CommonJS harnesses and `runAsync()` for native ESM loading.

## Test ownership

- Keep pure resolution, parsing, generation, and runner decisions in focused flat unit tests.
- Put observable CLI, shell, package-scope, file-layout, setup, cleanup, retry, and stdin behavior
  in Leia examples. Keep fixtures beside their scenario; share only when multiple consumers need them.
- Run automatic-format examples from their own directories to test invocation-directory detection.
- Preserve macOS, Ubuntu, and Windows matrices. Keep explicit format overrides in the dedicated
  Linux workflow; execution targets and generated-harness formats are independent axes.
- Source CI jobs run without `dist/`; built jobs remove application source and the sibling artifact.

## CLI presentation and configuration

- Start with uncolored `usage:`, then description, options, examples, and environment variables.
  Use lowercase labels and active descriptions; preserve literal option values.
- Show only `-c`, `-s`, and `-t` for header options while accepting long aliases. Keep descriptions
  and defaults together without forced wrapping; list version, debug, and help last.
- Use Lando pink accents, semantic status colors, bold commands/options, and dim placeholders/defaults.
  Preserve no-color readability, normal stdout output, and stderr diagnostics.
- Resolve flags before `LEIA_*` defaults, then built-in defaults. Validate effective values; flags
  replace environment lists. Booleans accept `1`/`true` and `0`/`false`; negative flags override them.
- `LEIA_DEBUG` and value-free `--debug` enable `*`; otherwise ambient `DEBUG` remains independent.
  Keep ambient controls out of help and list Leia environment variables by their option equivalents.
- Stdin is independent of CI: EOF by default, inherited only when enabled. Keep environment defaults
  at the CLI boundary so library calls retain explicit options.

## Agent bundle

- Skills use the `leia` namespace in a `codex-plugin` container; pass both explicitly to skill tooling.
- `skills/scenarios/` owns the shared Leia workflow. Keep it independent of host-specific tools and
  external Tanaab skill installations. The Codex bundle is also consumed by OpenClaw.
- Package the skill, manifest, logo, and referenced user guides together. Plugin installation does
  not install Leia into the user's project. Keep npm and plugin identities distinct.

## Documentation

- Keep README onboarding, CLI reference, ADVANCED behavior, generated API contracts, CI guidance, and CONTRIBUTING instructions
  aligned with their owning code. Edit public docblocks and regenerate `API.md`; do not edit it directly.
- Record user-visible changes in the unreleased changelog, not validation logs or implementation history.
- Preserve literal commands, flags, paths, environment variables, and package metadata.

## Validation

- Keep `.bun-version` and `package.json#packageManager` aligned. Run `bun run check:toolchain` and
  `bun install --frozen-lockfile --ignore-scripts`; use Node from `.node-version` for artifact checks.
- Keep flat ESLint and standalone Prettier separate. Run lint, typecheck, and test scripts for source changes.
- Run `bun run check:build` for build/entrypoint changes and `bun run docs:api:check` for public API docs.
  Build before `bun run check:package` when packaging or shipped documentation changes.
- `test:app` uses `LEIA_RUNTIME=source|esm|cjs`; `test:dev` uses Bun. Neither builds implicitly.
- Full Leia, shell, module-format, and OS scenarios are CI-owned unless operational validation is requested.
- Run `git diff --check` and narrowly validate changed JSON/YAML. Never commit generated harnesses,
  coverage, dependencies, or scenario scratch state. See CONTRIBUTING for commands and check boundaries.
