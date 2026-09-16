# GitHub Actions

Use this guide to run your project's Leia scenarios in CI. Start with the complete
[single-runner workflow](./README.md#run-in-github-actions); Leia needs no custom GitHub Action.

## Test supported platforms

Use a matrix when your project promises behavior on more than one operating system. This example
runs the README's `quickstart.md` on Linux, macOS, and Windows:

<!-- leia-example:github-actions-matrix -->

```yaml
name: Leia
on: [push, pull_request]
permissions:
  contents: read
jobs:
  scenarios:
    strategy:
      # Preserve evidence from the other platforms when one fails.
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, macos-15, windows-2025]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
      - run: npm ci
      - run: npm exec --offline -- leia quickstart.md
```

Keep only platforms your project supports. Add a Node version axis only when testing multiple
supported Node versions proves a separate compatibility promise; Leia requires Node 24 or newer.
Test specialized shells or explicit harness formats in focused jobs instead of multiplying the
whole matrix.

## Prepare the scenario environment

- Commit the npm lockfile and install development dependencies. If the project uses Bun, pnpm,
  or Yarn, retain its pinned toolchain and frozen install command instead of adding a second lockfile.
- Build the product under test and install any commands or services the scenarios need before
  invoking Leia. An installed Leia package does not need Bun or a source build.
- Set `working-directory` to the package whose scope should determine automatic harness format.
  Commands inside scenarios run beside their markdown file; these are distinct directories.
- Match command syntax to the selected shell. Use `--shell` only when that shell is installed on
  the runner; shell-specific scenarios may need separate matrix entries.
- Keep input non-interactive. CI does not enable Leia stdin inheritance. See [CLI options](./CLI.md#options)
  and [execution behavior](./ADVANCED.md#understand-execution).
- Run untrusted pull requests without secrets or write permissions. Use `pull_request`, not a
  privileged workflow that checks out and executes untrusted code.

## Diagnose failures

Keep Leia's exit status intact: do not add `continue-on-error` or append `|| true` to the test step.
Read the failing scenario's command output first, then distinguish a product failure from a missing
prerequisite or shell mismatch. Rerun the same scenario and options in the affected environment.

When a scenario produces useful diagnostic files, upload only its known output directory with an
`if: failure()` artifact step. Avoid archiving environment dumps, credentials, or the whole workspace.
