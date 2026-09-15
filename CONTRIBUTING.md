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

Node 24, selected by `.node-version`, remains required for the legacy Mocha/nyc suite, generated-harness
syntax checks, Node-based example commands, and built JavaScript validation. New TypeScript tests run
through Mocha on Bun; the legacy suite retains Node compatibility with dependencies such as `mock-fs`.

For [Lando](https://docs.lando.dev/basics/installation.html), `lando start` provisions Node 24 and
bootstraps Bun from `.bun-version` through npm. Then use `lando bun run <script>`. npm is used only
for this Bun bootstrap and npm distribution operations, not repository dependency resolution.

## Canonical commands

| Command                   | Purpose                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `bun run check:toolchain` | Verify the Bun runtime and matching package-manager metadata                                |
| `bun run leia --help`     | Execute `app/bin/leia.ts` directly                                                          |
| `bun run dev <files>`     | Restart the source CLI when its loaded modules change                                       |
| `bun run lint:eslint`     | Run flat ESLint with the shared TypeScript layer and legacy overrides                       |
| `bun run format:check`    | Check standalone Prettier formatting                                                        |
| `bun run format:write`    | Apply the repository's formatting rules                                                     |
| `bun run lint`            | Run ESLint and format checking                                                              |
| `bun run typecheck`       | Strictly check application, tooling, and TypeScript tests without emitting files            |
| `bun run test`            | Run both the legacy and TypeScript unit suites                                              |
| `bun run test:unit`       | Run the same combined unit suite                                                            |
| `bun run test:legacy`     | Build, then run existing compatibility tests through Node Mocha and nyc                     |
| `bun run test:typescript` | Run scope-local `app/` and `tooling/` `.spec.ts` tests through Bun Mocha                    |
| `bun run build`           | Clean and build Node-compatible ESM JavaScript and source maps into `dist/`                 |
| `bun run watch`           | Build once, then rebuild when files under `app/` change                                     |
| `bun run check:build`     | Verify repeatability, source/Node CLI parity, and bounded watch rebuild in a temporary copy |
| `bun run test:lifecycle`  | Check source/build lifecycle parity, including timeout, signals, retries, and stdin         |
| `bun run test:leia`       | Run the portable Markdown scenarios; normally CI-owned                                      |
| `bun run test:leia:stdin` | Run the stdin scenario in an interactive terminal                                           |

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

## Migration boundaries

`app/` owns the strict TypeScript ESM application, [compiler](./docs/compiler.md), and
[execution lifecycle](./docs/lifecycle.md). The public entrypoint lives in `app/bin/`; parsing,
orchestration, process execution, and APIs live in `app/lib/`. `tooling/` owns build and validation.

The root remains CommonJS for `bin/`, `lib/`, legacy tests, and root-level `auto` harness detection.
The adapters contain no CLI or runner behavior: Bun loads typed source; Node loads built ESM.
Run `bun run build` before using the Node CLI or CommonJS API in a source checkout.

`dist/bin/leia.js` runs with Node 24. `dist/lib/app.js` exports the CLI entrypoint;
`dist/lib/api.js` exports orchestration and runner APIs; `dist/lib/compiler.js` exports the compiler;
`dist/lib/runtime.js` serves generated harnesses. Dependencies stay external. Final npm exports,
declarations, artifact wiring, and installed-runtime policy remain in
[#66](https://github.com/lando/leia/issues/66).

## Open a pull request

- Target 2.0 development at `2.x` and bounded 1.x maintenance at `main`.
- Forward-port applicable 1.x fixes from `main` to `2.x` through focused pull requests.
- Keep the change focused and connect it to its issue when one exists.
- Update the README and unreleased changelog when behavior changes for users or developers.
- Describe what changed and include the validation you ran.
- Make sure the automated checks pass before requesting review.

For help, join the `#contributors` channel in the
[Lando Slack community](https://www.launchpass.com/devwithlando).
