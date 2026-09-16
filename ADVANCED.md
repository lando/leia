# Advanced usage

This guide is the complete user reference for authoring Leia scenarios, selecting CLI behavior,
and diagnosing failed runs. Start with the [README](./README.md) for installation and a first
passing scenario. Programmatic consumers should also use the generated [API reference](./API.md).

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

The first level-one heading names the suite. By default, level-two headings beginning with
`Start`, `Setup`, or `This is the dawning` are setup; headings beginning with `Test`,
`Validat`, or `Verif` are tests; and headings beginning with `Clean`, `Tear`, or `Burn` are
cleanup. Matching is case-sensitive.

Within a fenced block:

- Comment lines become the human-readable test name.
- The remaining lines are one shell command. Backslash continuations are folded before execution.
- A blank line begins another test.
- The normalized command `skip` marks that test pending.

Setup, test, and cleanup commands are ordered tests with independent retry budgets. An ordinary
failure does not suppress later tests or cleanup. Headings below level two do not change the active
section, and code outside a recognized section is ignored.

Leia writes temporary command scripts and generated `.leia.cjs` or `.leia.mjs` harnesses beneath
the operating system's temporary directory. Edit the Markdown source, never those generated files.

## CLI reference

`leia <files...> [options]` accepts files and glob patterns. Unknown positional values remain file
patterns for compatibility.

| Option                                           | Purpose                                           | Default                           |
| ------------------------------------------------ | ------------------------------------------------- | --------------------------------- |
| `-c, --cleanup-header <names...>`                | Match cleanup section prefixes                    | `Clean,Tear,Burn`                 |
| `-i, --ignore <patterns...>`                     | Exclude matching files                            | none                              |
| `-r, --retry <count>`                            | Retry each failed setup, test, or cleanup command | `1`                               |
| `-s, --setup-header <names...>`                  | Match setup section prefixes                      | `Start,Setup,This is the dawning` |
| `-t, --test-header <names...>`                   | Match test section prefixes                       | `Test,Validat,Verif`              |
| `-v, --version`                                  | Print the installed Leia version                  |                                   |
| `--debug[=<namespace>]`                          | Enable all debug output or one namespace          | disabled                          |
| `--help`                                         | Print current usage, options, and defaults        |                                   |
| `--module-format <auto\|commonjs\|esm>`          | Select the generated harness format               | `auto`                            |
| `--shell <bash\|cmd\|powershell\|pwsh\|sh\|zsh>` | Run commands with a supported shell               | platform selection                |
| `--stdin`                                        | Attach the invoking input stream to commands      | closed input                      |
| `--timeout <seconds>`                            | Set each command deadline; `0` disables deadlines | `1800`                            |

Repeated header and ignore options greedily collect values until the next option. A single header
value may also be comma-separated. `--retry` accepts a non-negative safe integer. `--timeout`
accepts whole seconds from `0` through `2147483`; Leia rejects invalid values before generating a
harness.

The hidden `--spawn` and `--split-file` compatibility flags remain accepted no-ops and emit a
warning. Remove them from automation. Run `npm exec -- leia --help` when scripting against an
installed version; the binary is the authority for that version's defaults.

## Choose a module format

`--module-format` controls generated harnesses, not Leia's package format:

- `auto` starts from the invocation's initial working directory and walks upward to the nearest
  `package.json`. An explicit `"type": "module"` selects ESM. Any other readable package scope,
  or no package file, selects CommonJS.
- `commonjs` always writes a `.leia.cjs` harness.
- `esm` always writes a `.leia.mjs` harness.

Leia reports an unreadable or malformed nearest package file instead of silently guessing. One
resolved format applies to every Markdown source in an invocation. Explicit extensions keep the
generated file independent from the temporary directory's package scope.

## Select a shell

Without `--shell`, Leia uses deterministic platform precedence:

- Windows: `SHELL`, then `MSYSTEM=MINGW64` with `bash.exe`, then `COMSPEC`, then `cmd.exe`.
- macOS and other Unix systems: the account shell from `os.userInfo()`, then `SHELL`, then
  `/bin/zsh` on macOS or `/bin/sh` elsewhere.

An unrecognized programmatic shell uses Leia's `sh` command shape. The CLI accepts only the shells
listed in the reference table. PowerShell scenarios receive stop-on-error behavior so a failed
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

Without `--stdin`, commands receive EOF. With it, they inherit the invoking input stream while
stdout and stderr remain captured. A nonzero exit, spawn error, signal-only exit, or timeout fails
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

Noninteractive POSIX commands run in a separate process group. Interactive cancellation targets
only descendants of the active command. Leia sends `SIGTERM`, then `SIGKILL` after 250 milliseconds
when necessary. Windows uses `taskkill /T /F`. Descendants that deliberately escape their process
group are outside the process-tree guarantee.

## Troubleshoot a run

### Leia finds no tests

Confirm that the file has a level-one title, a level-two heading matching the configured test
prefixes, and a top-level fenced block beneath that heading. Quote glob patterns and inspect
`--ignore` values if no files are discovered.

### The wrong module format is selected

Run with explicit `--module-format commonjs` or `--module-format esm`. For `auto`, inspect the
nearest `package.json` above the directory where Leia was invoked, not the directory containing the
Markdown file.

### A command waits for input

The default input stream is closed. Add `--stdin` only when the command genuinely reads from the
invoking stream. stdout and stderr remain captured even when stdin is attached.

### A command works in a terminal but fails in Leia

Check the selected shell, the Markdown file's directory, and the reported stdout, stderr, and exit
status. Select a supported shell explicitly when CI and developer machines resolve different
account shells.

### An old invocation prints warnings

Remove `--spawn` and `--split-file`; they no longer change execution. Supported scenario syntax,
CLI flags, and the root constructor remain compatible with Leia 1.x.
