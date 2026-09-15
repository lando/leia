# Contributing to Leia

Leia welcomes focused bug fixes, features, tests, and documentation improvements. Open an issue first when a change
needs design discussion or when you are unsure whether it fits the project. See the [README](./README.md) for usage.

## Local setup

Development on `2.x` uses the exact Bun version in `.bun-version`. That file is the version authority;
`package.json#packageManager` records the same version for package-manager tooling. Install it using the
[Bun installation instructions](https://bun.sh/docs/installation), then verify the runtime and metadata:

```bash
git clone --branch 2.x https://github.com/lando/leia.git
cd leia
bun run check:toolchain
bun install --frozen-lockfile --ignore-scripts
```

`bun.lock` is the only dependency lockfile. Use `bun add` or `bun remove` for dependency changes and
commit the resulting lockfile. Do not generate npm or Yarn lockfiles. Install scripts are not required
for this repository's development dependencies. Bun is the development toolchain, not a new runtime
requirement for installed npm artifacts.

Node 24, selected by `.node-version`, remains required for generated-harness syntax checks, Node-based
example commands, and built JavaScript validation. Source and tooling specs run on Bun;
the same application specs run against both built targets on Node 24.

For [Lando](https://docs.lando.dev/basics/installation.html), `lando start` provisions Node 24 and
bootstraps Bun from `.bun-version` through npm. Then use `lando bun run <script>`. npm is used only
for this Bun bootstrap and npm distribution operations, not repository dependency resolution.

## Canonical commands

| Command                   | Purpose                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `bun run check:toolchain` | Verify the Bun runtime and matching package-manager metadata                                  |
| `bun run leia --help`     | Execute `bin/leia.ts` directly                                                                |
| `bun run dev <files>`     | Restart the source CLI when its loaded modules change                                         |
| `bun run lint:eslint`     | Run flat ESLint with the shared TypeScript layer and scenario overrides                       |
| `bun run format:check`    | Check standalone Prettier formatting                                                          |
| `bun run format:write`    | Apply the repository's formatting rules                                                       |
| `bun run lint`            | Run ESLint and format checking                                                                |
| `bun run typecheck`       | Strictly check application, tooling, and TypeScript tests without emitting files              |
| `bun run test`            | Run application and tooling TypeScript unit tests without building                            |
| `bun run test:unit`       | Run selected application tests and Bun tooling tests                                          |
| `bun run build`           | Clean and build Node ESM/CommonJS JavaScript and source maps into `dist/esm/` and `dist/cjs/` |
| `bun run watch`           | Build once, then rebuild when files under `bin/`, `lib/`, or `utils/` change                  |
| `bun run check:build`     | Verify repeatability, source/Node CLI parity, and bounded watch rebuild in a temporary copy   |
| `bun run test:lifecycle`  | Check three-target lifecycle parity, including timeout, signals, retries, and stdin           |
| `bun run test:leia`       | Run the portable Markdown scenarios; normally CI-owned                                        |
| `bun run test:leia:stdin` | Run the stdin scenario in an interactive terminal                                             |

The retired `nyc` configuration measured adapters, not application coverage. No coverage percentage
is reported until source-aware coverage is established in the validation pass.

Before opening a pull request, run:

```bash
bun run lint
bun run typecheck
bun run test
bun run check:build
```

CI reads `.bun-version`, installs with the same frozen, ignore-scripts command, and runs these scripts.
Lint/typecheck, unit tests, and build/watch checks have separate gates. The full Leia, shell, automatic
package-scope, and explicit CommonJS/ESM scenarios retain their existing OS matrices. `check:build`
uses a temporary copy and shared installed dependencies; it never edits the working checkout.

Prettier owns formatting; ESLint owns code-quality checks. Embedded Markdown code is not reformatted,
parser fixtures and generator templates retain their literal whitespace, and archived changelog entries
are excluded with Prettier range markers. Preserve those behavior-bearing inputs during mechanical changes.

## Source and build boundaries

Leia is one package, so its source lives directly under the repository root: `bin/` for the
public CLI, `lib/` for the [compiler](./docs/compiler.md) and [execution lifecycle](./docs/lifecycle.md),
`utils/` for independently testable functions, and flat `test/` for specs and fixtures.
`tooling/` separately owns build and validation; `dist/` contains generated artifacts only.

The root package is ESM; each built target declares its own module format. Root-level `auto` harness detection therefore selects
ESM; explicit format overrides and scenario-owned CommonJS or untyped packages retain their behavior.
CommonJS helpers use `.cjs`. There are no migration adapters or parallel application implementations.
Run `bun run build` before using the Node CLI or package API in a source checkout.

| Target        | Invocation                   | Build required? |
| ------------- | ---------------------------- | --------------- |
| Bun source    | `bun bin/leia.ts`            | No              |
| Node ESM      | `node dist/esm/bin/leia.js`  | Yes             |
| Node CommonJS | `node dist/cjs/bin/leia.cjs` | Yes             |

The build generates thin Node launchers over the same `lib/app.ts` implementation used by the
Bun source launcher. Each artifact scope contains its own compiler, runtime, API, and utilities;
ESM files use `.js`, and CommonJS files use `.cjs`. Dependencies stay external.
`package.json` points at the ESM CLI and constructor; direct CommonJS artifacts also preserve
`require()` returning the Leia constructor. Final npm conditional exports, declaration distribution,
and tarball verification remain in [#66](https://github.com/lando/leia/issues/66).

`LEIA_RUNTIME=source|esm|cjs` selects the target for `bun run test:app` and executable scenarios.
The same TypeScript application specs run on Bun for source and Node 24 for built targets;
tooling specs run only on Bun via `bun run test:tooling`. Application and tooling unit commands never build implicitly.
The source CI jobs assert that `dist/` does not exist. Built CI jobs remove application source and
the sibling artifact before testing. The isolated build check uses focused API/CLI and runtime
probes in relocated temporary copies, without rerunning the unit suite. It also verifies clean
output, CLI parity, and watch rebuilds of both formats.

Execution target and generated harness format are separate axes: all three targets run across
macOS, Ubuntu, and Windows. Lifecycle probes cover both harness formats for every target;
the Linux module-format matrix focuses on explicit overrides and package-boundary assertions
rather than repeating the general examples.

## Open a pull request

- Target 2.0 development at `2.x` and bounded 1.x maintenance at `main`.
- Forward-port applicable 1.x fixes from `main` to `2.x` through focused pull requests.
- Keep the change focused and connect it to its issue when one exists.
- Update the README and unreleased changelog when behavior changes for users or developers.
- Describe what changed and include the validation you ran.
- Make sure the automated checks pass before requesting review.

For help, join the `#contributors` channel in the
[Lando Slack community](https://www.launchpass.com/devwithlando).
