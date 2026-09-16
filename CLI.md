# CLI

Use this guide to run Leia from a terminal or npm script. Start with the [README](./README.md)
for installation and a first scenario; see [advanced usage](./ADVANCED.md) for scenario behavior.

> [!WARNING]
> Leia runs real commands and can mutate your machine. Prefer ephemeral CI. Read repository
> guidance and the [execution safety notes](./ADVANCED.md#execution-safety) before running locally.

## Invocation

```sh
# run the installed project dependency without fetching a package.
npm exec --offline -- leia quickstart.md

# select the scoped package when using npx.
npx --package=@lando/leia -- leia quickstart.md

# invoke the installed javascript launcher directly with node.
node node_modules/@lando/leia/dist/esm/bin/leia.js quickstart.md

# quote patterns so leia, rather than your shell, expands them.
npm exec --offline -- leia "docs/**/*.md" --ignore "docs/archive/**"
```

`npx` can download `@lando/leia` when it is missing locally. Install the project dependency first
for a lockfile-backed version; `--offline` prevents network access, not use of npm's cache.

For repeatable project commands, add a script to your existing `package.json`:

```json
{
  "scripts": {
    "test:docs": "leia quickstart.md"
  }
}
```

```sh
# npm scripts put local dependency binaries on path.
npm run test:docs

# arguments after -- are passed to leia.
npm run test:docs -- --timeout 60
```

### Bun

Install with `bun add --dev @lando/leia` and add this `package.json` script:

```json
{
  "scripts": {
    "leia": "bun ./node_modules/.bin/leia"
  }
}
```

```sh
# run the installed cli explicitly with bun.
bun run leia quickstart.md
```

The script selects Bun explicitly; installing with Bun alone leaves the Node launcher in use.
Keep Node if your scenario commands require it.

## Options

CLI options override `LEIA_*` environment values, which override built-in defaults. Library calls
use explicit options and do not read CLI defaults. Run `leia --help` for the installed version's
contract. Positional arguments are files or globs; unknown values remain file patterns for compatibility.

### `--cleanup-header`

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| Alias       | `-c`                                        |
| Environment | `LEIA_CLEANUP_HEADER`                       |
| Default     | `Clean,Tear,Burn`                           |
| Values      | one or more case-sensitive section prefixes |
| Description | Selects cleanup sections.                   |

### `--ignore`

| Field       | Value                     |
| ----------- | ------------------------- |
| Alias       | `-i`                      |
| Environment | `LEIA_IGNORE`             |
| Default     | none                      |
| Values      | one or more glob patterns |
| Description | Excludes matching files.  |

Quote globs so Leia expands them. Put positional file patterns before greedy list options.

### `--retry`

| Field       | Value                                                |
| ----------- | ---------------------------------------------------- |
| Alias       | `-r`                                                 |
| Environment | `LEIA_RETRY`                                         |
| Default     | `1`                                                  |
| Values      | non-negative safe integer                            |
| Description | Retries each failed setup, test, or cleanup command. |

The value counts retries after the initial attempt. `0` runs each command once.

### `--setup-header`

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| Alias       | `-s`                                        |
| Environment | `LEIA_SETUP_HEADER`                         |
| Default     | `Start,Setup,This is the dawning`           |
| Values      | one or more case-sensitive section prefixes |
| Description | Selects setup sections.                     |

### `--test-header`

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| Alias       | `-t`                                        |
| Environment | `LEIA_TEST_HEADER`                          |
| Default     | `Test,Validat,Verif`                        |
| Values      | one or more case-sensitive section prefixes |
| Description | Selects test sections.                      |

### `--module-format`

| Field       | Value                                 |
| ----------- | ------------------------------------- |
| Environment | `LEIA_MODULE_FORMAT`                  |
| Default     | `auto`                                |
| Values      | `auto`, `commonjs`, `esm`             |
| Description | Selects the generated harness format. |

`auto` uses the nearest package scope above the invocation directory. See [module formats](./ADVANCED.md#choose-a-module-format).

### `--shell`

| Field       | Value                                            |
| ----------- | ------------------------------------------------ |
| Environment | `LEIA_SHELL`                                     |
| Default     | platform selection                               |
| Values      | `bash`, `cmd`, `powershell`, `pwsh`, `sh`, `zsh` |
| Description | Selects the shell that runs scenario commands.   |

The shell must be installed. See [shell selection](./ADVANCED.md#select-a-shell) for platform defaults.

### `--stdin`

| Field       | Value                                                   |
| ----------- | ------------------------------------------------------- |
| Environment | `LEIA_STDIN`                                            |
| Default     | off                                                     |
| Values      | value-free flag; environment: `1`, `true`, `0`, `false` |
| Description | Attaches the invoking input stream to commands.         |

`--no-stdin` disables inheritance. Otherwise commands receive EOF. `CI` does not enable stdin or make commands safe to run.

### `--timeout`

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| Environment | `LEIA_TIMEOUT`                              |
| Default     | `1800` seconds                              |
| Values      | whole seconds from `0` through `2147483`    |
| Description | Sets the deadline for each command attempt. |

`0` disables the deadline. A timeout fails the attempt and terminates its process tree within the [documented limits](./ADVANCED.md#understand-execution).

### `--version`

| Field       | Value                             |
| ----------- | --------------------------------- |
| Alias       | `-v`                              |
| Values      | value-free flag                   |
| Description | Shows the installed Leia version. |

### `--debug`

| Field       | Value                                                   |
| ----------- | ------------------------------------------------------- |
| Environment | `LEIA_DEBUG`                                            |
| Default     | off                                                     |
| Values      | value-free flag; environment: `1`, `true`, `0`, `false` |
| Description | Enables every debug namespace (`*`).                    |

`--no-debug` disables Leia's toggle. Ambient `DEBUG` remains independent, including when the toggle is explicitly disabled. With neither enabled, debug output is off.

### `--help`

| Field       | Value                                                      |
| ----------- | ---------------------------------------------------------- |
| Values      | value-free flag                                            |
| Description | Shows usage, options, examples, and environment variables. |

## Environment defaults

Empty environment values are unset. Environment lists use commas; surrounding whitespace and
empty entries are removed. Header and ignore flags replace their environment lists. Repeated list
flags greedily collect values until the next option; header values may also be comma-separated.

Numeric and enumerated environment values follow their option constraints. Only effective values
are validated, so an explicit flag can override an invalid environment value. For booleans, the
last explicit positive or negative flag wins; these flags take no value.

## Compatibility flags

`--spawn` and `--split-file` remain accepted no-ops and emit a warning. Remove them from automation.
They have no environment defaults and are hidden from help.
