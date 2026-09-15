# CLI and execution lifecycle

## Typed boundaries

`app/lib/cli.ts` parses arguments without a CLI framework. `app.ts` initializes debug before loading
orchestration and dispatches help, version, discovery, parsing, generation, and execution. `leia.ts`
provides the shared programmatic API. `run.ts` owns Mocha loading and invocation-scoped signals.
`runtime.ts` connects generated tests to `execute.ts`, which owns child processes and stream closure.

The source CLI runs on pinned Bun. The built CLI runs on Node 24. Both use the same strict TypeScript
implementation and produce explicit `.leia.cjs` or `.leia.mjs` harnesses. CommonJS `run()` remains
synchronous; `runAsync()` loads either format. Final package wiring is separate from this port.

## Compatibility and deliberate fixes

| Surface         | Contract                                                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flags           | Existing names, short aliases, hidden `--spawn`/`--split-file` no-ops, defaults, greedy repeated strings, single-value comma-separated headers, and non-strict positional patterns remain.                                   |
| Numeric options | Retry is a non-negative safe integer; timeout is whole seconds up to 2147483. Zero timeout disables deadlines.                                                                                                               |
| Reporting       | Mocha retains test names, stage order, skipped tests, per-test retries, and ordinary success/failure output. Failed process diagnostics retain code/stdout/stderr.                                                           |
| Exit            | CLI success/help/version: 0; test, validation, loading, or spawn failure: 1; caught SIGHUP/SIGINT/SIGTERM: 129/130/143.                                                                                                      |
| Environment/cwd | Commands run from the Markdown directory and inherit the invocation environment plus existing Leia metadata. Each retry gets its attempt number.                                                                             |
| stdin/TTY       | Default stdin is a closed pipe (EOF). `--stdin` inherits fd 0 without manufacturing a terminal. stdout and stderr stay piped, even when stdin is a terminal.                                                                 |
| Timeout         | The process deadline replaces Mocha's competing timer for generated commands. Termination and stream closure finish before Mocha sees failure and retries or continues.                                                      |
| Signals         | The first caught signal cancels active setup/test execution and skips subsequent setup/tests while permitting cleanup. A signal during cleanup, or a second signal, cancels cleanup too. Signal cancellation is not retried. |

Setup and cleanup remain ordinary ordered tests, including their own retry budgets. They are not
converted to hooks. Ordinary setup/test failures and timeouts do not prevent later tests or cleanup.

Noninteractive POSIX execution uses a separate process group. Interactive commands stay in the
terminal session; cancellation snapshots their descendants with `ps` and signals only those PIDs,
never the caller's foreground group. Cancellation sends SIGTERM to the group, then SIGKILL
after 250 ms, including descendants that ignored polite termination. Windows uses `taskkill /T /F`
to terminate the active process tree. Windows does not expose POSIX signal delivery; forceful process
termination and SIGKILL cannot promise cleanup. Descendants that deliberately escape their process
group are outside the process-tree guarantee.

These are deliberate repairs to unspecified legacy failure paths: `command-line-test` left unattached
stdin open, did not terminate timed-out children, and could treat signal-only exits as success. The
new execution boundary closes stdin, drains streams, treats signal exits as failure, and serializes
termination with retries. Mocha signal handlers are scoped to each run and removed afterward.

## Dependencies and adapters

- Removed oclif's command/config/error/help and development/test packages, `@lando/argv`, and
  `command-line-test`.
- Retained Mocha for compatible harness loading, reporting, and retry semantics; `debug` and `chalk`
  retain diagnostics and presentation. These dependencies work through ESM interoperability.
- Compiler dependencies (`glob`, `marked`, `lodash`, `detect-newline`, and `object-hash`) remain from
  the compiler port. `@lando/chai` remains for generated-harness compatibility. `fs-extra` is now
  test-only.
- `bin/leia` and `lib/*.js` are thin CommonJS package adapters, not parallel implementations. Generated
  harnesses retain `createRequire` in their ESM dependency prelude for cross-platform path loading.

## Verification

`app/test/cli.spec.ts` covers every flag and alias, numeric rejection, debug precedence, and parser
edge cases. `execute.spec.ts` covers stream draining, EOF, cwd/environment, spawn/nonzero failures,
timeouts, and cancellation state. Existing compiler and Node API assertions remain in the test suite;
renderer snapshots explicitly reflect the new runtime call.

`bun run test:lifecycle` executes the same checked-in scenario through Bun source and Node build,
in both harness formats. It covers success; failure, retry, and timeout in setup/test/cleanup;
environment/cwd; stdin/EOF; descendant termination; catchable POSIX signals; and real POSIX PTYs (using the test-only Python 3 standard library).
The Leia, shell, and module-format CI matrices exercise both entrypoints on their existing platforms.
Local validation proves only the current host; other operating-system results belong to CI.
