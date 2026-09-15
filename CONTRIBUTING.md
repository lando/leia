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
example commands, and built JavaScript validation. Source and development helper specs run on Bun;
the same application specs run against both built targets on Node 24.

For [Lando](https://docs.lando.dev/basics/installation.html), `lando start` provisions Node 24 and
bootstraps Bun from `.bun-version` through npm. Then use `lando bun run <script>`. npm is used only
for this Bun bootstrap and npm distribution operations, not repository dependency resolution.

## Canonical commands

| Command                   | Purpose                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `bun run check:toolchain` | Verify the Bun runtime and matching package-manager metadata                                                 |
| `bun run leia --help`     | Execute `bin/leia.ts` directly                                                                               |
| `bun run dev <files>`     | Restart the source CLI when its loaded modules change                                                        |
| `bun run lint:eslint`     | Run flat ESLint with the shared TypeScript layer and scenario overrides                                      |
| `bun run format:check`    | Check standalone Prettier formatting                                                                         |
| `bun run format:write`    | Apply the repository's formatting rules                                                                      |
| `bun run lint`            | Run ESLint and format checking                                                                               |
| `bun run typecheck`       | Strictly check application, development helpers, and TypeScript tests without emitting files                 |
| `bun run test`            | Run application and development helper TypeScript unit tests without building                                |
| `bun run test:coverage`   | Measure selected Node ESM unit tests against original TypeScript; requires an existing build                 |
| `bun run test:unit`       | Run selected application tests and Bun development helper tests                                              |
| `bun run build`           | Clean and build Node ESM/CommonJS JavaScript, declarations, and source maps into `dist/esm/` and `dist/cjs/` |
| `bun run watch`           | Build once, then rebuild when files under `bin/`, `lib/`, or `utils/` change                                 |
| `bun run check:build`     | Verify repeatability, declaration emission, freshness gates, and watch rebuild in a temporary copy           |
| `bun run check:dist`      | Reject missing, changed, or stale build output before packing                                                |
| `bun run check:package`   | Install the exact npm tarball in a temporary consumer; check exports, contents, and strict types             |
| `bun run test:lifecycle`  | Check three-target lifecycle parity, including timeout, signals, retries, and stdin                          |
| `bun run test:leia`       | Run the portable Markdown scenarios; normally CI-owned                                                       |
| `bun run test:leia:stdin` | Run the stdin scenario in an interactive terminal                                                            |

Run `bun run build` followed by `bun run test:coverage` to measure application unit coverage.
The command uses Node ESM and linked source maps to report original `lib/**/*.ts` and
`utils/**/*.ts` files, including unexecuted modules. It rejects empty, incomplete, or incorrectly
mapped reports. Reports are written to ignored `coverage/` as text, JSON, LCOV, and HTML.

CI collects coverage once, in the existing Ubuntu ESM unit job, and uploads the reports as the
`typescript-unit-coverage` artifact. It does not add another suite run or execution target.
The report excludes type-only modules, generated launchers, dependencies, tests, and development helpers;
it does not measure the separate cross-platform lifecycle scenarios. No percentage threshold is
imposed; this establishes a source-aware baseline without replacing behavioral assertions.

Before opening a pull request, run:

```bash
bun run lint
bun run typecheck
bun run test
bun run check:build
bun run build
bun run check:package
```

CI reads `.bun-version`, installs with the same frozen, ignore-scripts command, and runs these scripts.
Lint/typecheck, unit tests, and build/watch checks have separate gates. The full Leia, shell, automatic
package-scope, and explicit CommonJS/ESM scenarios retain their existing OS matrices. `check:build`
uses a temporary copy and shared installed dependencies; it never edits the working checkout.
`check:package` uses npm to install a packed artifact and consumer-owned TypeScript into an isolated
temporary directory, without repository dependency links. Both checks keep Leia execution disabled
locally; CI adds `--scenarios` for CLI parity and installed-binary/generated-harness scenarios.

Prettier owns formatting; ESLint owns code-quality checks. Embedded Markdown code is not reformatted,
parser fixtures and generator templates retain their literal whitespace, and archived changelog entries
are excluded with Prettier range markers. Preserve those behavior-bearing inputs during mechanical changes.

## Source and build boundaries

Leia is one package, so its source lives directly under the repository root: `bin/` for the
public CLI, `lib/` for the [compiler](./docs/compiler.md) and [execution lifecycle](./docs/lifecycle.md),
`utils/` for independently testable functions, and flat `test/` for specs and fixtures.
`dev/` separately owns build and validation; `dist/` contains generated artifacts only.

The root package is ESM; each built target declares its own module format. Root-level `auto` harness detection therefore selects
ESM; explicit format overrides and scenario-owned CommonJS or untyped packages retain their behavior.
CommonJS helpers use `.cjs`. There are no migration adapters or parallel application implementations.
Run `bun run build` before using the Node CLI or package API in a source checkout.

| Target        | Invocation                   | Build required? |
| ------------- | ---------------------------- | --------------- |
| Bun source    | `bun bin/leia.ts`            | No              |
| Node ESM      | `node dist/esm/bin/leia.js`  | Yes             |
| Node CommonJS | `node dist/cjs/bin/leia.cjs` | Yes             |

The build generates thin Node launchers over the same `lib/run-cli.ts` implementation used by the
Bun source launcher. Each artifact scope contains its own compiler, runtime, API, and utilities;
ESM files use `.js`, and CommonJS files use `.cjs`. Dependencies stay external. Linked source maps
embed the original TypeScript and support Node diagnostics with `--enable-source-maps`, including
when the artifacts are relocated without application source.
`package.json` routes imports to ESM and requires to CommonJS, preserves the constructor API,
and exposes only the [documented subpaths](./README.md#module). Bun remains the sole JavaScript
emitter. The pinned CJS bundler needs independent entrypoint builds to avoid shared-export
mislinking and an emitted-file URL banner for relocatable paths; installed Node consumers exercise
that output. TypeScript emits declarations only, with `.js`/`.d.ts` references for ESM and
`.cjs`/`.d.cts` references for CommonJS. A small CommonJS root declaration describes the constructor
returned by the existing JavaScript compatibility footer.

The build writes `dist/build-receipt.json` last, recording input and artifact hashes. `npm pack`
and source-directory `npm publish` run `check:dist` through `prepack`; changed inputs, altered or
missing output, and extra stale files require a fresh `bun run build`. The receipt is not published.
The tarball includes only `dist/esm`, `dist/cjs`, and npm's package metadata, README, and license.
Source maps embed TypeScript for diagnostics; standalone source, tests, and development helpers are excluded.

Release checks build after version stamping, validate an installed tarball, and dry-run/publish that
same `.tgz`. `check:package --pack-destination=.temp/package --scenarios` retains the verified tarball
for this CI-owned path. This command does not publish anything.

`LEIA_RUNTIME=source|esm|cjs` selects the target for `bun run test:app` and executable scenarios.
The same TypeScript application specs run on Bun for source and Node 24 for built targets;
Development helper specs run only on Bun via `bun run test:dev`. Application and development helper unit commands never build implicitly.
The source CI jobs assert that `dist/` does not exist. Built CI jobs remove application source and
the sibling artifact before testing. The isolated build check uses focused API/CLI and runtime
probes in relocated temporary copies, without rerunning the unit suite. It also verifies clean
output and watch rebuilds of both formats; CLI parity and harness execution require `--scenarios`.

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
