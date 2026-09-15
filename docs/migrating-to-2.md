# Migrating to Leia 2.0

This guide is for projects and contributors moving from Leia 1.x to 2.0. Start with the
[README](../README.md) for a new installation or [Using Leia](./using-leia.md) for the current user
contract.

## Support boundary

Leia 1.x maintenance remains on the repository's `main` branch and npm's `latest` channel until the
approved 2.0 release cutover. Leia 2.0 development lives on `2.x`; prereleases publish to npm's
`edge` channel. After the stable release, `latest` becomes the 2.0 channel and `main` becomes the
2.0 line.

Bounded 1.x fixes should target `main` and be forward-ported to `2.x` when applicable. New 2.0
features and migrations target `2.x`. The historical `leia-parser` package and its
[`v0.4.0` documentation](https://github.com/lando/leia/tree/v0.4.0) are older, separate surfaces.

## Consumer changes

| 1.x assumption or behavior                                   | 2.0 contract and replacement                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Node versions below 24 may run the package                   | Node 24 or newer is required. Upgrade the runtime before upgrading Leia.                     |
| The package is consumed primarily through CommonJS           | Both ESM `import` and CommonJS `require()` are supported through conditional exports.        |
| `require('@lando/leia')` returns the constructor             | Preserved. ESM may use the default or named `Leia` export.                                   |
| Internal `lib/`, `utils/`, or built paths can be imported    | Deep implementation imports are private. Use one of the documented public subpaths.          |
| Root source adapters or `bin/leia` can be invoked            | Installed entrypoints target `dist/`. Use the package exports or installed `leia` binary.    |
| Programmatic code uses synchronous `run()` for every harness | Keep `run()` for explicit CommonJS; use `await runAsync()` for ESM or automatic selection.   |
| Generated harnesses may use a package-sensitive `.leia.js`   | Harnesses use explicit `.leia.cjs` or `.leia.mjs` extensions.                                |
| A nested CommonJS `package.json` protects old harness output | Remove that workaround when it exists only for Leia; explicit extensions now own the format. |
| `auto` can be inferred from each Markdown file's directory   | One format is resolved from the invocation directory and applies to the entire invocation.   |
| Malformed nearest package metadata may be ignored            | Fix the nearest `package.json`; automatic format selection now fails explicitly.             |
| `--spawn` or `--split-file` may be carried in automation     | Remove both flags. They remain accepted no-ops and now warn.                                 |

The package now exposes declarations for the root constructor and the `find`, `parse`, `generate`,
`run`, `shell`, `module-format`, and `compiler` subpaths. TypeScript consumers should use
`node16` or `nodenext` resolution instead of reaching into source files for types.

## CLI and behavior changes

Core scenario syntax, flag names and aliases, header matching, Mocha reporting, retry semantics, and
setup/test/cleanup ordering remain compatible. The following intentional 2.0 changes affect
observable behavior:

- Help, status, warning, error, next-action, and completion output has new Lando presentation.
  Scripts should use exit status and documented stream ownership rather than matching decoration.
- Normal status and completion text goes to stdout. Warnings and actionable errors go to stderr.
  Color is stable for CI and non-TTY output and obeys `NO_COLOR` and `FORCE_COLOR`.
- `--debug=<namespace>` enables that namespace and is no longer mistaken for an input pattern.
- Invalid, fractional, negative, or out-of-range retry and timeout values fail before harness
  generation. `--timeout=0` explicitly disables command deadlines.
- The programmatic `reporter` option is honored.
- Commands without `--stdin` receive EOF instead of an open unattached stream. Add `--stdin` only
  for scenarios that intentionally read from the invoker.
- A nonzero exit, spawn error, signal-only exit, or timeout fails an attempt. Timeouts terminate the
  child process tree before retry or cleanup.
- On POSIX, the first caught `SIGHUP`, `SIGINT`, or `SIGTERM` stops active setup/test work, skips
  remaining setup/tests, and permits cleanup. A second signal or one received during cleanup stops
  cleanup. Windows and uncatchable termination cannot guarantee cleanup.
- Missing scenario titles and malformed generation metadata now fail with focused errors before
  partial file emission.

These failure-path repairs replace unspecified or unsafe 1.x behavior. They are not flags to restore:
update automation that depended on hanging stdin, surviving descendants, or signal-only success.
The [execution lifecycle](./lifecycle.md) gives the exact platform and exit-status contract.

## Contributor changes

| 1.x development surface                          | 2.0 replacement                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| npm or Yarn installs and lockfiles               | Bun 1.3.14 from `.bun-version`, `bun install --frozen-lockfile --ignore-scripts`     |
| JavaScript/CommonJS application source           | Strict TypeScript ESM in root `bin/`, `lib/`, and `utils/`                           |
| Node source CLI                                  | `bun run leia` or `bun bin/leia.ts`                                                  |
| Root adapters and parallel implementations       | One typed source; generated Node ESM and CommonJS targets under `dist/`              |
| doT templates and replacement definition folders | Typed renderer; arbitrary template settings and replacement definitions are gone     |
| Direct source use from Node                      | Run `bun run build`, then use a `dist/esm` or `dist/cjs` entrypoint                  |
| Source changes tolerated after a build           | Rebuild before packing; the build receipt rejects missing, modified, or stale output |

The port removes oclif, `@lando/argv`, `command-line-test`, adapter-only coverage packages, and
obsolete test helpers. These were implementation dependencies, not replacement APIs. Mocha, debug,
chalk, compiler dependencies, and `@lando/chai` remain where their public behavior is required.

[Contributing](../CONTRIBUTING.md) owns setup, canonical scripts, build boundaries, validation, and
release preparation. Do not copy its command list into migration automation; invoke the package
scripts so repository changes remain centralized.

## Upgrade checklist

1. Move the consuming environment to Node 24 or newer.
2. Install the 2.0 prerelease with `npm install --save-dev @lando/leia@edge`.
3. Remove `--spawn`, `--split-file`, deep imports, source adapters, and package-scope workarounds.
4. Choose `run()` only for known CommonJS harnesses; otherwise await `runAsync()`.
5. Run representative scenarios with explicit CommonJS and ESM formats before restoring `auto`.
6. Update output assertions to use exit status, stdout/stderr ownership, and stable semantic text.
7. Test timeout, stdin, signal, retry, and cleanup behavior used by the project.
8. After every environment passes, replace the prerelease range with the stable 2.0 range when
   released.
