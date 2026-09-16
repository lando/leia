# GitHub Actions

Use this guide to run your project's Leia scenarios in CI. Start with the complete
[single-runner workflow](./README.md#run-in-github-actions); Leia needs no custom GitHub Action.

## Test scenarios across platforms

Copy [basic-example.md](./examples/basic-example.md) and
[setup-cleanup-example.md](./examples/setup-cleanup-example.md) into your project's `examples/`
directory, or list your own scenarios below. Install Leia and commit your npm lockfile as shown in
the [README](./README.md#run-in-github-actions). Each OS/scenario pair gets its own job.

<!-- leia-example:github-actions-matrix -->

```yaml
name: Leia
on:
  pull_request:
permissions:
  contents: read
jobs:
  scenarios:
    name: ${{ matrix.os }} / ${{ matrix.scenario }}
    env:
      SCENARIO: ${{ matrix.scenario }}
    defaults:
      run:
        shell: bash
    strategy:
      fail-fast: false
      matrix:
        os:
          - ubuntu-24.04
          - macos-15
          - windows-2025
        scenario:
          - examples/basic-example.md
          - examples/setup-cleanup-example.md
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
      - run: npm ci
      - run: npm exec --offline -- leia "$SCENARIO" --shell bash
```

This runs six jobs. These recipes require Bash and standard Unix tools; the Windows runner uses
Git Bash. Keep only supported platforms and list scenarios explicitly so fixtures are not swept in.
Custom-header, interactive, and specialized-shell cases need their own invocation options.
Add a Node version axis only when it proves a separate compatibility promise.

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
