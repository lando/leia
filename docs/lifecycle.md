# CLI and execution lifecycle

## Typed boundaries

`lib/cli.ts` parses arguments without a CLI framework. `lib/run-cli.ts` initializes debug before loading
orchestration and dispatches help, version, discovery, parsing, generation, and execution. `leia.ts`
provides the shared programmatic API. `run.ts` owns Mocha loading and invocation-scoped signals.
`runtime.ts` connects generated tests to `execute.ts`, which owns child processes and stream closure.

The source CLI runs on pinned Bun. Both built CLI formats run on Node 24. All three targets use the same strict TypeScript
implementation and produce explicit `.leia.cjs` or `.leia.mjs` harnesses. CommonJS `run()` remains
synchronous; `runAsync()` loads either format. Final package wiring is separate from this port.

## Compatibility and deliberate fixes

| Surface         | Contract                                                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flags           | Existing names, short aliases, hidden `--spawn`/`--split-file` no-ops, defaults, greedy repeated strings, single-value comma-separated headers, and non-strict positional patterns remain.                                   |
| Numeric options | Retry is a non-negative safe integer; timeout is whole seconds up to 2147483. Zero timeout disables deadlines.                                                                                                               |
| Reporting       | Mocha retains test names, stage order, skipped tests, per-test retries, and ordinary success/failure output. Failed process diagnostics retain code/stdout/stderr.                                                           |
| Presentation    | Human help, run status, warnings, errors, next actions, and completion summaries use Lando's primary accent plus semantic status colors. Meaning remains explicit in text with color disabled.                               |
| Exit            | CLI success/help/version: 0; test, validation, loading, or spawn failure: 1; caught SIGHUP/SIGINT/SIGTERM: 129/130/143.                                                                                                      |
| Environment/cwd | Commands run from the Markdown directory and inherit the invocation environment plus existing Leia metadata. Each retry gets its attempt number.                                                                             |
| stdin/TTY       | Default stdin is a closed pipe (EOF). `--stdin` inherits fd 0 without manufacturing a terminal. stdout and stderr stay piped, even when stdin is a terminal.                                                                 |
| Timeout         | The process deadline replaces Mocha's competing timer for generated commands. Termination and stream closure finish before Mocha sees failure and retries or continues.                                                      |
| Signals         | The first caught signal cancels active setup/test execution and skips subsequent setup/tests while permitting cleanup. A signal during cleanup, or a second signal, cancels cleanup too. Signal cancellation is not retried. |

Setup and cleanup remain ordinary ordered tests, including their own retry budgets. They are not
converted to hooks. Ordinary setup/test failures and timeouts do not prevent later tests or cleanup.

Normal status and completion output goes to stdout. Warnings, errors, and next actions go to stderr;
Mocha retains its existing reporter streams. Color is automatic only for interactive terminals,
disabled for non-TTY and CI output, suppressed by `NO_COLOR`, and explicitly controlled by
`FORCE_COLOR`. No mode emits cursor movement or other interactive-only control sequences.

The hidden `--spawn` and `--split-file` compatibility flags remain accepted and remain no-ops. Leia
2.0 now warns when either is supplied. Remove them after all callers have moved to Leia 2.0; their
presence does not change execution or exit status.

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

## Dependencies and entrypoints

- Removed oclif's command/config/error/help and development/test packages, `@lando/argv`, and
  `command-line-test`.
- Retained Mocha for compatible harness loading, reporting, and retry semantics; `debug` and `chalk`
  retain diagnostics and presentation. These dependencies work through ESM interoperability.
- Compiler dependencies (`glob`, `marked`, `lodash`, `detect-newline`, and `object-hash`) remain from
  the compiler port. `@lando/chai` remains for generated-harness compatibility. Adapter-only `nyc`
  coverage and the former test dependencies `mock-fs` and `fs-extra` are removed.
- Source and tests load typed ESM directly; the Node CLIs load generated ESM or CommonJS
  from their isolated `dist/esm/` or `dist/cjs/` scopes without root adapters. Generated harnesses retain `createRequire` in their ESM
  dependency prelude for cross-platform path loading.

## Verification

`test/cli.spec.ts` covers every flag and alias, numeric rejection, debug precedence, parser edge
cases, and help, validation-error, runtime-failure, success, no-color, forced-color, and non-TTY
presentation across source, ESM, and CommonJS targets. `test/presentation.spec.ts` isolates terminal
capability, semantic style, stream, and multiline-diagnostic behavior. `execute.spec.ts` covers stream draining, EOF, cwd/environment, spawn/nonzero failures,
timeouts, and cancellation state. Focused `test/process-tree.spec.ts`, `test/process-error.spec.ts`, and
`test/runtime-layout.spec.ts` cover descendant selection, error precedence, and source/build paths. Existing compiler and runner assertions now run from TypeScript under `test/`;
renderer snapshots explicitly reflect the new runtime call.
`test/run.spec.ts` checks that both harness loaders leave existing signal handlers intact and
that handlers attached during a run are removed after success or failure.

`bun run test:lifecycle` executes the same checked-in scenario through Bun source, Node ESM, and Node CommonJS,
in both harness formats. It covers success; failure, retry, and timeout in setup/test/cleanup;
environment/cwd; stdin/EOF; descendant termination before retries and later stages; catchable POSIX signals;
and real POSIX PTYs (using the test-only Python 3 standard library). It also asserts zero retries,
disabled timeouts, failure diagnostics, skipped later stages, and a second signal cancelling cleanup
while preserving the first signal's exit code. Signal probes disable process deadlines and wait for
the descendant's termination handler to be ready, so a timeout cannot masquerade as cancellation.
The Leia, shell, and module-format CI matrices exercise all three targets on their existing platforms, independently from generated harness format.
`LEIA_RUNTIME` selects one target per CI job; no job silently falls back to another artifact.
Local validation proves only the current host; other operating-system results belong to CI.
