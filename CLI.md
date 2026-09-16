# CLI

Use this guide to run Leia from a terminal or npm script. Start with the [README](./README.md)
for installation and a first scenario; see [advanced usage](./ADVANCED.md) for scenario behavior.

## Invocation

```sh
# Run the installed project dependency without fetching a package.
npm exec --offline -- leia quickstart.md

# Use npx when you want its normal local-package resolution.
npx leia quickstart.md

# Invoke the installed JavaScript launcher directly with Node.
node node_modules/@lando/leia/dist/esm/bin/leia.js quickstart.md

# Quote patterns so Leia, rather than your shell, expands them.
npm exec --offline -- leia "docs/**/*.md" --ignore "docs/archive/**"
```

`npx` can offer to download Leia when it is missing locally. Install it as a project dependency
when you need the version recorded in your lockfile.

For repeatable project commands, add a script to your existing `package.json`:

```json
{
  "scripts": {
    "test:docs": "leia quickstart.md"
  }
}
```

```sh
# npm scripts put local dependency binaries on PATH.
npm run test:docs

# Arguments after -- are passed to Leia.
npm run test:docs -- --timeout 60
```

## Options

`leia <files...> [options]` accepts files and glob patterns. Unknown positional values remain file
patterns for compatibility.

| Option                                           | Purpose                                           | Default                           |
| ------------------------------------------------ | ------------------------------------------------- | --------------------------------- |
| `-c, --cleanup-header <names...>`                | Match cleanup section prefixes                    | `Clean,Tear,Burn`                 |
| `-i, --ignore <patterns...>`                     | Exclude matching files                            | none                              |
| `-r, --retry <count>`                            | Retry each failed setup, test, or cleanup command | `1`                               |
| `-s, --setup-header <names...>`                  | Match setup section prefixes                      | `Start,Setup,This is the dawning` |
| `-t, --test-header <names...>`                   | Match test section prefixes                       | `Test,Validat,Verif`              |
| `--module-format <auto\|commonjs\|esm>`          | Select the generated harness format               | `auto`                            |
| `--shell <bash\|cmd\|powershell\|pwsh\|sh\|zsh>` | Run commands with a supported shell               | platform selection                |
| `--stdin`                                        | Attach the invoking input stream to commands      | closed input                      |
| `--timeout <seconds>`                            | Set each command deadline; `0` disables deadlines | `1800`                            |
| `-v, --version`                                  | Print the installed Leia version                  |                                   |
| `--debug`                                        | Enable all debug output                           | disabled                          |
| `--help`                                         | Print current usage, options, and defaults        |                                   |

Repeated header and ignore options greedily collect values until the next option. A single header
value may also be comma-separated. `--retry` accepts a non-negative safe integer. `--timeout`
accepts whole seconds from `0` through `2147483`; Leia rejects invalid values before generating a
harness.

### Environment defaults

CLI options override `LEIA_*` environment values, which override the defaults above. Library calls
keep their explicit options and do not read these CLI defaults. Empty environment values are unset.

| Variable              | Equivalent option         |
| --------------------- | ------------------------- |
| `LEIA_CLEANUP_HEADER` | `-c` / `--cleanup-header` |
| `LEIA_SETUP_HEADER`   | `-s` / `--setup-header`   |
| `LEIA_TEST_HEADER`    | `-t` / `--test-header`    |
| `LEIA_IGNORE`         | `--ignore`                |
| `LEIA_RETRY`          | `--retry`                 |
| `LEIA_TIMEOUT`        | `--timeout`               |
| `LEIA_SHELL`          | `--shell`                 |
| `LEIA_MODULE_FORMAT`  | `--module-format`         |
| `LEIA_STDIN`          | `--stdin`                 |
| `LEIA_DEBUG`          | `--debug`                 |

Environment lists use commas; surrounding whitespace and empty entries are removed. Supplying a
header or ignore flag replaces its environment list. Numeric and enumerated values follow the same
constraints as CLI options. Overridden environment values are not validated.

Boolean values accept `1`/`true` and `0`/`false`. Use `--no-stdin` or `--no-debug` to override an enabled
environment default; the last explicit positive or negative flag wins. These flags take no value.

`LEIA_DEBUG=1` and `--debug` enable every debug namespace (`*`). Otherwise ambient `DEBUG` remains
in control, including when Leia's toggle is explicitly disabled. With neither enabled, debug output
is off.

The hidden `--spawn` and `--split-file` compatibility flags remain accepted no-ops and emit a
warning. Remove them from automation. Run `npm exec -- leia --help` when scripting against an
installed version; the binary is the authority for that version's defaults.
