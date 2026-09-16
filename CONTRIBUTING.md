# Contributing to Leia

Start with the [README](./README.md) for usage. Open an issue when a change needs design discussion.

## Setup

Install the Bun version in `.bun-version` and Node from `.node-version`, then:

```sh
git clone --branch 2.x https://github.com/lando/leia.git
cd leia
bun run check:toolchain
bun install --frozen-lockfile --ignore-scripts
```

`.bun-version` is authoritative; keep `package.json#packageManager` aligned. Use `bun add` or
`bun remove` and commit `bun.lock`. Dependency install scripts are unnecessary; do not add npm or
Yarn lockfiles. Installed Leia packages require Node 24, not Bun.

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
The package ships both artifact trees plus npm's package metadata, README, and license. Companion
guides stay in the repository and are linked from the shipped README.

## Pull requests and releases

- Target 2.0 work at `2.x` and bounded 1.x maintenance at `main`; forward-port applicable fixes.
- Keep changes focused, link their issue when one exists, and report validation in the PR.
- Update the owning user guide or API docblock when behavior changes, and record user-visible
  changes in the unreleased changelog. Let CI pass before requesting review.

Release automation builds after version stamping, validates a retained tarball with
`check:package --scenarios --pack-destination=.temp/package`, then dry-runs and publishes those same
bytes. Prereleases use `edge`; stable releases use `latest` and also update `edge`.
