# Contributing to Leia

Leia welcomes focused bug fixes, features, tests, and documentation improvements. Open an issue first when a change
needs design discussion or when you are unsure whether it fits the project.

## Local setup

Development on `2.x` uses Bun. The exact version in `package.json#packageManager` is the single
Bun version authority for contributors and CI. Install that version using the
[Bun installation instructions](https://bun.sh/docs/installation), then check it before installing dependencies:

```bash
git clone --branch 2.x https://github.com/lando/leia.git
cd leia
bun run check:toolchain
bun install --frozen-lockfile
```

`bun.lock` is the only dependency lockfile. Use `bun add` or `bun remove` for dependency changes and
commit the resulting lockfile. Do not generate npm or Yarn lockfiles. CI verifies the Bun version
before installing. This is a development-toolchain choice, not a new installed-package runtime requirement.

Node 24, selected by `.node-version`, is still required for legacy Mocha/nyc tests, generated-harness
syntax checks, Node-based example commands, and validation of built JavaScript. Bun orchestrates
these tools without forcing Node-only dependencies such as `mock-fs` onto Bun's runtime.

For [Lando](https://docs.lando.dev/basics/installation.html), `lando start` provisions Node 24 and
bootstraps the pinned Bun package through npm. Then use `lando bun run <script>`. npm is used only
for this Bun bootstrap and npm distribution operations, not repository dependency resolution.

## Canonical commands

| Command                   | Purpose                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `bun run leia --help`     | Execute the checked-in TypeScript CLI directly                                    |
| `bun run dev <files>`     | Restart the source CLI when its loaded modules change                             |
| `bun run lint`            | Lint legacy JavaScript and type-aware TypeScript                                  |
| `bun run typecheck`       | Strictly check source and build tooling without emitting files                    |
| `bun run test`            | Run the compatibility/unit suite through Node Mocha and nyc                       |
| `bun run test:unit`       | Run that same focused legacy suite, including source CLI failure/cleanup          |
| `bun run build`           | Clean and build ESM JavaScript plus source maps into `dist/`                      |
| `bun run watch`           | Build once, then rebuild when files under `src/` change                           |
| `bun run check:build`     | Verify repeatable clean output, source/Node CLI parity, and bounded watch rebuild |
| `bun run test:leia`       | Run the portable Markdown scenarios; normally CI-owned                            |
| `bun run test:leia:stdin` | Run the stdin scenario in an interactive terminal                                 |

Before opening a pull request, run:

```bash
bun run lint
bun run typecheck
bun run test
bun run check:build
```

CI installs with `bun install --frozen-lockfile` and runs these same commands. The full Leia, shell,
automatic package-scope, and explicit CommonJS/ESM scenarios retain their existing OS matrices.
`check:build` temporarily adds a source export to prove watch mode rebuilds a changed dependency;
it restores that file and the clean output before returning. Do not run it alongside an editor or another build.

## Migration boundaries

`src/` is strict TypeScript ESM. Its application entrypoint, `runCLI`, crosses one typed adapter in
`src/legacy.ts` to the unported CommonJS CLI. The old Node binary uses the same bootstrap, so debug,
error, flag, and execution behavior remain owned by the compatibility implementation.

The root package stays explicitly CommonJS for `bin/`, `cli/`, `lib/`, tests, and existing root-level
`auto` harness detection. `src/package.json` and `scripts/package.json` mark the new ESM scopes;
`dist/package.json` marks built output. No generated TypeScript entrypoint or source shim is needed.
The compiler configuration uses bundler resolution, verbatim module syntax, strict checks,
unchecked-index protection, and exact optional properties, following
[Bun's TypeScript guidance](https://bun.sh/docs/typescript).

`dist/cli.js` runs with Node 24 from the checkout. The build deliberately keeps the relative
CommonJS bridge and its dependencies external. It is an incremental development build, not a
standalone npm artifact: final exports, declarations, dual-format packaging, and installed-runtime
policy belong to [#66](https://github.com/lando/leia/issues/66). The compiler and CLI/runner ports belong to
[#64](https://github.com/lando/leia/issues/64) and [#65](https://github.com/lando/leia/issues/65).

## Open a pull request

- Target 2.0 development at `2.x` and bounded 1.x maintenance at `main`.
- Forward-port applicable 1.x fixes from `main` to `2.x` through focused pull requests.
- Keep the change focused and connect it to its issue when one exists.
- Update the README and unreleased changelog when behavior changes for users or developers.
- Describe what changed and include the validation you ran.
- Make sure the automated checks pass before requesting review.

For help, join the `#contributors` channel in the
[Lando Slack community](https://www.launchpass.com/devwithlando).
