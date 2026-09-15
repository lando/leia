# Leia Repository Guidance

Keep this root guidance broadly applicable to repository work. Put narrower executable-example
rules in `examples/AGENTS.md`.

## Branch Routing

- Target 2.0 pull requests at `2.x` and bounded 1.x maintenance pull requests at `main`.
- Forward-port applicable 1.x fixes from `main` to `2.x` through focused pull requests.
- Keep `main` as the default branch until the approved 2.0 release cutover.

## Product Boundaries

- On `main`, Leia is a Node.js CommonJS package that generates and runs Mocha harnesses from Markdown.
- For 1.x maintenance, keep the package, CLI, and implementation CommonJS. Module-format support
  applies to generated harnesses; it is not permission to migrate Leia itself to ESM or dual-package
  output.
- Resolve one concrete module format per invocation. `auto` starts from the invocation's initial
  working directory and uses only the nearest `package.json`.
- Generate explicit `.leia.cjs` or `.leia.mjs` files so runtime classification never depends on the
  temporary directory's package scope.
- Preserve synchronous `run()` for CommonJS harnesses and use `runAsync()` for native ESM loading.

## Source Map

- The repository root owns Leia: `bin/` for the public CLI, `lib/` for compiler and lifecycle orchestration, `utils/` for independently testable functions, and flat `test/` for their specs and fixtures. No extra `app/` or `src/` wrapper.
- `dev/`: build/check libraries, thin internal `scripts/`, focused `utils/`, and flat TypeScript `test/`.
- `lib/render.ts`: typed harness templates; `docs/compiler.md` documents the compiler IR.
- `examples/`: executable Leia specifications and their scenario-owned package boundaries or
  fixtures.
- `.github/workflows/`: lint, unit, cross-platform scenario, shell, module-format, and release
  automation.

## Test Ownership

- Keep pure resolution, parsing, generation, and runner decisions in focused unit tests under
  `test/`.
- Put observable CLI, shell, package-scope, file-layout, setup, cleanup, retry, and stdin behavior
  in Leia examples rather than JavaScript subprocess integration fixtures.
- Keep scenario-owned static inputs beside the Markdown file that consumes them. Hoist a fixture
  only after multiple examples genuinely share one contract.
- Run automatic module-format examples from their own directories; passing their Markdown paths
  from the repository root does not test invocation-directory detection.
- Preserve the supported macOS, Ubuntu, and Windows matrices. Exercise explicit CommonJS and ESM
  overrides in the dedicated Linux module-format workflow instead of multiplying every OS job.
- See `examples/AGENTS.md` before editing executable scenarios or their fixtures.

## Documentation And Release Notes

- Keep `README.md` aligned with public CLI help, programmatic APIs, module-format semantics, and
  compatibility guidance.
- Record user-visible changes in `CHANGELOG.md`; do not use release notes as a test log.
- Preserve literal commands, flags, paths, environment variables, and package metadata exactly.

## Validation

- On `2.x`, use `.bun-version` as the Bun authority and keep `package.json#packageManager` in sync.
- Run `bun run check:toolchain` and `bun install --frozen-lockfile --ignore-scripts`.
- Keep flat ESLint and standalone Prettier separate; `lint` composes lint and format checks.
- Keep the package root ESM; use explicit `.cjs` for CommonJS helpers and preserve scenario-owned module scopes.
- Retain Node from `.node-version` for generated-harness syntax, Node-specific assertions, and built-output checks.
- Run `bun run lint`, `bun run typecheck`, and `bun run test` for source changes.
- Run `bun run check:build` for build or entrypoint changes; it validates clean output and watch rebuild in a temporary copy.
- Keep TypeScript specs beside their owning scope. `test:app` runs the same application specs against `LEIA_RUNTIME=source|esm|cjs` using Bun or Node 24; `test:dev` always uses Bun. Neither command builds implicitly.
- Source CI jobs must run without `dist/`. Built jobs remove application source and the sibling artifact. Keep execution target independent from generated harness format.
- Keep application source in the explicit ESM scope; preserve intentional CommonJS scenario fixtures and compatibility assertions.
- Treat the full Leia, shell, module-format, and operating-system scenarios as CI-owned by default;
  do not run them locally unless operational validation is explicitly requested.
- Run `git diff --check` for text or workflow changes and validate changed JSON and workflow YAML
  with the narrowest available checks.
- Never commit generated harnesses, coverage output, dependency directories, or scenario scratch
  state.
