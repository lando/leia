# Contributing to Leia

Start with the [README](./README.md) for usage. Open an issue when a change needs design discussion.

## Setup

Install the Bun version in `.bun-version` and Node from `.node-version`, then:

```sh
git clone --branch main https://github.com/lando/leia.git
cd leia
bun run check:toolchain
bun install --frozen-lockfile --ignore-scripts
```

`.bun-version` is authoritative; keep `package.json#packageManager` aligned. Use `bun add` or
`bun remove` and commit `bun.lock`. Dependency install scripts are unnecessary; do not add npm or
Yarn lockfiles. Installed Leia packages use Node 24 by default and also support [explicit Bun invocation](./CLI.md#bun).

Alternatively, `lando start` provisions Node and bootstraps the pinned Bun version. Use
`lando bun run <script>` inside that environment.

## Develop and validate

| Task                       | Command                |
| -------------------------- | ---------------------- |
| Run source                 | `bun run leia <files>` |
| Restart source on edits    | `bun run dev <files>`  |
| Build Node artifacts       | `bun run build`        |
| Rebuild artifacts on edits | `bun run watch`        |
| Apply formatting           | `bun run format:write` |
| Regenerate API docs        | `bun run docs:api`     |

For source changes, run:

```sh
bun run lint
bun run typecheck
bun run test
```

`lint` combines ESLint and Prettier. Preserve literal whitespace in parser fixtures, harness
rendering, and executable Markdown; embedded code and released changelog history have formatting
exclusions. Generated harnesses, scratch files, dependencies, and coverage output stay untracked.

Use the additional checks that match the change:

- Public API docs: `bun run docs:api:check`. Edit source docblocks, then regenerate `API.md`.
- Build or entrypoints: `bun run check:build` checks repeatability, declarations, freshness,
  source maps, isolation, and watch rebuilds in a temporary copy.
- Packaging or shipped docs: `bun run build && bun run check:package` installs the exact tarball
  into an isolated consumer and checks exports, types, contents, and documentation links.
- Coverage: `bun run build && bun run test:coverage` reports original TypeScript under ignored
  `coverage/`. CI collects it once in the Ubuntu ESM unit job; no percentage threshold is imposed.

`LEIA_RUNTIME=source|esm|cjs` selects the application-test target. `test:app` uses Bun for source and
Node for built targets; `test:dev` always uses Bun. Neither builds implicitly. Source CI jobs run
without `dist/`; built jobs remove source and the sibling artifact to catch fallback imports.

The full Leia, shell, lifecycle, and module-format scenarios are CI-owned by default. CI adds
`--scenarios` to build/package checks to exercise relocated CLI and installed documentation examples.
The macOS, Ubuntu, and Windows matrices test execution targets separately from harness formats.

## Source and distribution

`bin/` contains the thin CLI launcher, `lib/` the compiler and lifecycle, `utils/` focused helpers,
and `test/` their specs and fixtures. `dev/` owns build, validation, and documentation helpers.
See [AGENTS.md](./AGENTS.md) and [examples/AGENTS.md](./examples/AGENTS.md) for editing boundaries.

The root is ESM. Bun emits independent Node artifacts under `dist/esm/` and `dist/cjs/`, including
thin launchers over `lib/run-cli.ts`; TypeScript emits matching declarations. Dependencies stay
external. Source maps embed TypeScript so diagnostics survive relocation. Package exports select
ESM or CommonJS and expose only the [documented subpaths](./API.md#entry-points).

Run `node dist/esm/bin/leia.js` or `node dist/cjs/bin/leia.cjs` after building. `check:dist` rejects
missing, altered, or stale artifacts through the build receipt; `npm pack` runs it automatically.
The package ships both artifact trees, npm metadata, the README and license, and the shared skill
bundle with its referenced user guides and selected Bash examples. Keep the example allowlist
limited to reusable scenarios and their fixtures; internal probes remain checkout-only.

## Pull requests and releases

- Target `main` for current development. Leia 1.x is unsupported; direct users to upgrade to 2.x.
- Keep changes focused, link their issue when one exists, and report validation in the PR.
- Update the owning user guide or API docblock when behavior changes, and record user-visible
  changes in the unreleased changelog. Let CI pass before requesting review.

Release automation runs repository and npm publication as independent jobs from the event's original
SHA. Both use [the local preparation action](./.github/actions/prepare-release/action.yml), also
exercised by the release tests. Callers install Node, Bun, and dependencies before preparation.
Only the repository job enables sync, targeting `main`; other callers default to `sync: false`.
Either publisher can succeed while the other fails. Inspect existing publication and stamped
changelog state before retrying a failed job; repository sync is not guaranteed to be idempotent.

The npm job builds after version stamping, validates a retained tarball with
`check:package --scenarios --pack-destination=.temp/package`, then dry-runs and publishes those same
bytes. Prereleases use `edge`; stable releases use `latest` and also update `edge`. Before a stable
release, confirm that `NPM_DEPLOY_TOKEN` is available to the workflow and permits dist-tag updates
for `@lando/leia`. Trusted publishing handles package publication, but does not authorize this
separate tag operation. After publication, verify both tags and fresh registry installs.

The npm tarball also carries the shared Codex/OpenClaw skill and its referenced guides. Keep
`.codex-plugin/plugin.json` at the package version; release preparation stamps both before packing.
`check:package` validates the installed bundle's metadata, assets, and documentation links. Use the procedure below for host testing.

## Install a local release candidate

Build and pack from a checkout using the contributor toolchain:

```sh
# verify package contents and write the tarball under .temp/package/.
bun run build
bun run check:package --pack-destination=.temp/package
```

For OpenClaw, pass the resulting `.tgz` path to `openclaw plugins install`.
For Codex, extract the tarball into an empty directory, then create this marketplace file beside
the extracted `package/` directory as `.agents/plugins/marketplace.json`:

```json
{
  "name": "leia-local",
  "plugins": [
    {
      "name": "leia",
      "source": { "source": "local", "path": "./package" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Testing"
    }
  ]
}
```

Run these commands from that directory:

```sh
# register and install the extracted artifact.
codex plugin marketplace add .
codex plugin add leia@leia-local
```

The local catalog is for testing an artifact. It does not follow npm updates. Repack and reinstall
when reviewing another candidate. Keep local and published installs separate to avoid duplicate skills.
