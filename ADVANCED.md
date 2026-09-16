# Advanced usage

This guide covers scenario authoring, execution behavior, and diagnosing failed runs. Start with the [README](./README.md) for installation and a first
passing scenario. Programmatic consumers should also use the generated [API reference](./API.md).

## Upgrade from 1.x

Leia 1.x is unsupported. Install `@lando/leia@^2.0.0` and commit the updated lockfile.
Use Node 24 or newer, or the [explicit Bun project script](./CLI.md#bun).

- Replace private `@lando/leia/lib/*` imports with the documented [public exports](./API.md).
- Use `--debug` without a namespace value. Use ambient `DEBUG` for namespace selection.
- Remove `--spawn` and `--split-file`; they remain accepted but do nothing.
- Give every blank-line-separated executable block a `# should ...` description, including cleanup.
- Generated harnesses use `.leia.cjs` or `.leia.mjs`. Remove CommonJS package boundaries added only
  for old generated `.js` files; retain boundaries needed by your own helpers.
- Automatic module selection uses the nearest `package.json` from the invocation directory.
  Use `--module-format` for an explicit override.

## Execution safety

Leia is not a sandbox. Scenario commands inherit your environment and permissions and can mutate
files, installed software, services, or external systems. Prefer ephemeral CI runners with only the
permissions and credentials the scenario needs. Persistent self-hosted runners are still machines
that a test can alter.

Before a local run, read the invoking repository's `AGENTS.md` and any applicable directory guidance.
Honor CI-only restrictions. Inspect setup, tests, cleanup, and their dependencies before deciding
whether local execution is appropriate; a temporary directory or a passing cleanup step does not
undo arbitrary machine changes.

## Author a scenario

Leia reads top-level fenced code blocks beneath matching level-two headings. A complete workflow may
contain setup, test, and cleanup sections:

<!-- leia-example:lifecycle-scenario -->

````md
# Temporary greeting

## Setup

```sh
# should create the greeting
node -e "require('node:fs').writeFileSync('greeting.txt', 'Hello from Leia')"
```

## Testing

```sh
# should read the greeting
node -e "if (require('node:fs').readFileSync('greeting.txt', 'utf8') !== 'Hello from Leia') process.exit(1)"

# should skip a placeholder
skip
```

## Cleanup

```sh
# should remove the greeting
node -e "require('node:fs').rmSync('greeting.txt')"
```
````

The first level-one heading names the suite. Level-two prefixes select setup, tests, or cleanup
using the defaults in the [CLI reference](./CLI.md#options). Matching is case-sensitive.

Within a fenced block:

- Comment lines become the human-readable test name.
- The remaining lines are one shell command. Backslash continuations are folded before execution.
- A blank line begins another test.
- The normalized command `skip` marks that test pending.

Setup, test, and cleanup commands are ordered tests with independent retry budgets. An ordinary
failure does not suppress later tests or cleanup. Headings below level two do not change the active
section, and code outside a recognized section is ignored.

Edit the Markdown source; Leia generates command scripts and harnesses in the operating system's temporary directory.

## Choose a module format

`--module-format` controls generated harnesses, not Leia's package format:

- `auto` starts from the invocation's initial working directory and walks upward to the nearest
  `package.json`. An explicit `"type": "module"` selects ESM. Any other readable package scope,
  or no package file, selects CommonJS.
- `commonjs` always writes a `.leia.cjs` harness.
- `esm` always writes a `.leia.mjs` harness.

Leia reports an unreadable or malformed nearest package file instead of silently guessing. One
resolved format applies to every Markdown source in an invocation.

## Select a shell

When neither `--shell` nor `LEIA_SHELL` is set, Leia selects the shell as follows:

- Windows: `SHELL`, then `MSYSTEM=MINGW64` with `bash.exe`, then `COMSPEC`, then `cmd.exe`.
- macOS and other Unix systems: the account shell from `os.userInfo()`, then `SHELL`, then
  `/bin/zsh` on macOS or `/bin/sh` elsewhere.

An unrecognized programmatic shell uses Leia's `sh` command shape. The CLI accepts only the shells
listed in the [CLI reference](./CLI.md#options). PowerShell scenarios receive stop-on-error behavior so a failed
statement cannot quietly make a later statement look successful.

Commands run from the directory containing their Markdown file and inherit the invocation
environment plus Leia metadata.

| Variable            | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| `LEIA`              | `true` while a generated harness is loaded             |
| `LEIA_ENVIRONMENT`  | `true` while a generated harness is loaded             |
| `LEIA_VERSION`      | Installed Leia package version                         |
| `LEIA_TEST_RUNNING` | `true` while the harness runs                          |
| `LEIA_TEST_ID`      | Markdown filename without `.md` for the active command |
| `LEIA_TEST_NUMBER`  | One-based number within the active stage               |
| `LEIA_TEST_RETRY`   | Zero-based attempt number for the active command       |
| `LEIA_TEST_STAGE`   | `setup`, `test`, or `cleanup`                          |

`LEIA_PARSER_RUNNING`, `LEIA_PARSER_VERSION`, `LEIA_PARSER_ID`, and `LEIA_PARSER_RETRY` remain
available as compatibility aliases.

## Understand execution

Commands receive EOF unless `--stdin` or `LEIA_STDIN` enables inheritance; `--no-stdin` disables it.
CI does not change that choice. stdout and stderr remain captured. A nonzero exit, spawn error, signal-only exit, or timeout fails
the attempt. Timeouts terminate the active process tree before a retry or later command begins.

Leia writes normal run and completion status to stdout. Warnings, validation errors, execution
errors, and suggested next actions go to stderr; Mocha retains its reporter output. Color is
automatic for interactive terminals, disabled for non-TTY and CI output, suppressed by `NO_COLOR`,
and explicitly controlled by `FORCE_COLOR`.

Exit status is `0` for success, help, and version, and `1` for validation, loading, spawn, command,
or test failure. On POSIX, caught `SIGHUP`, `SIGINT`, and `SIGTERM` produce `129`, `130`, and
`143`. The first signal stops active setup or test work and permits cleanup. A second signal, or a
signal during cleanup, stops cleanup too. Windows and uncatchable termination cannot guarantee
cleanup.

Cancellation cannot guarantee termination of descendants that escape their process group.
