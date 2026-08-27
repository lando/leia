# Leia Repository Guidance

Keep this root guidance broadly applicable to repository work. Put narrower executable-example
rules in `examples/AGENTS.md`.

## Product Boundaries

- Leia is a Node.js CommonJS package that generates and runs Mocha harnesses from Markdown.
- Keep the package, CLI, and implementation CommonJS. Module-format support applies to generated
  harnesses; it is not permission to migrate Leia itself to ESM or dual-package output.
- Resolve one concrete module format per invocation. `auto` starts from the invocation's initial
  working directory and uses only the nearest `package.json`.
- Generate explicit `.leia.cjs` or `.leia.mjs` files so runtime classification never depends on the
  temporary directory's package scope.
- Preserve synchronous `run()` for CommonJS harnesses and use `runAsync()` for native ESM loading.

## Source Map

- `cli/`: the public oclif command, flags, help, and exit behavior.
- `lib/`: parsing, generation, runner orchestration, shell selection, and focused helpers.
- `templates/`: generated harness dependencies and the shared scenario body.
- `test/`: focused Mocha unit tests for repository-owned JavaScript behavior.
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

- Use the Node.js version pinned in `.node-version` and install dependencies with npm.
- Run `npm run lint` and `npm run test:unit` for JavaScript changes when dependencies are available.
- Treat the full Leia, shell, module-format, and operating-system scenarios as CI-owned by default;
  do not run them locally unless operational validation is explicitly requested.
- Run `git diff --check` for text or workflow changes and validate changed JSON and workflow YAML
  with the narrowest available checks.
- Never commit generated harnesses, coverage output, dependency directories, or scenario scratch
  state.
