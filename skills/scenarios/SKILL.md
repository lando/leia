---
name: leia-scenarios
description: Author, extract, run, and diagnose Leia markdown scenarios and configure their GitHub Actions coverage. Use when testing documented commands, turning examples or bug reproductions into executable tests, or adding a supported-platform CI matrix.
license: MIT
metadata:
  type: coding
  owner: tanaab
  tags:
    - tanaab
    - coding
    - testing
  openclaw:
    emoji: '👸'
    homepage: https://github.com/lando/leia
---

# Leia

## Overview

Help users prove documented command behavior through Leia's existing CLI. This skill serves Codex
and OpenClaw without host-specific tools or a separate test runner.

## When to Use

- Run existing Leia scenarios or diagnose failures.
- Find useful missing scenarios and extract them from docs, examples, or bug reproductions.
- Author scenarios for observable CLI, shell, setup, cleanup, or file-layout behavior.
- Configure GitHub Actions to run those scenarios on the project's supported environments.

## When Not to Use

- Pure internal logic belongs in the project's unit tests.
- General CI redesign, product refactoring, and release publication are separate tasks.

## Constraints

- Before every workflow, locate and read the invoking repository's `AGENTS.md` and `agentd.md`
  if present, inherited guidance, and narrower guidance applying to the target scenarios. Follow
  referenced policy files and check specifically for CI-only or no-local-Leia rules.
- Honor local-execution restrictions unless the user explicitly overrides them for this run. A
  generic request to test, diagnose, or author a scenario is not that override. Continue with static
  inspection, authoring, and CI configuration when local execution is prohibited; report execution
  as deferred to CI. A temporary checkout does not bypass the policy or isolate machine-wide effects.
- Prefer ephemeral CI runners. Preserve existing scenario, package-manager, and workflow conventions.
- Scenario commands execute real programs. Inspect commands before running them; use disposable
  state and restrict cleanup to scenario-owned paths. Obtain authorization for destructive or
  privileged operations, external side effects, or credentials beyond the requested task.
- Use the project's installed Leia version. Plugin installation supplies instructions, not a
  project dependency or permission to silently download software. Report missing prerequisites.
- Never invent expected behavior or weaken assertions to obtain a passing run. Derive expectations
  from product contracts, existing tests, or a verified reproduction; ask when the intended result is unclear.

## Change Strategy

For discovery requests, identify a few concrete gaps with their source evidence, expected result,
prerequisites, and value. Prefer the strongest small scenario over a broad suite. When implementation
is requested, build that scenario; when only assessment is requested, report candidates without edits.
Reuse scenario-owned fixtures and existing CI jobs before adding new files or matrix axes.

## Workflow

1. Read the invoking repository guidance and establish where execution is allowed before any Leia
   command, including a wrapper script. Identify the project root, requested outcome, scenarios,
   package manager, and supported environments. Locate Leia in the project dependency tree or an established project script.
2. When allowed by that guidance, check the installed version and help using the [CLI guide](../../CLI.md). Prefer a lockfile-backed
   local command such as `npm exec --offline -- leia --help`; adapt to the project's existing tooling.
3. Choose the requested path: run and diagnose, author or extract, or configure CI. Read only the
   relevant [scenario reference](../../ADVANCED.md) or [CI guide](../../GITHUB_ACTIONS.md). Use the
   bundled examples below for concrete patterns. Read and adapt them into the invoking project,
   including companion fixtures; do not execute them inside the installed plugin or dependency.
   These recipes require Bash and standard Unix tools. Follow the invoking project's execution policy.
4. Make the bounded change, perform the relevant validation below, and report changed files, exact
   commands, outcomes, and any missing environment proof. Do not call an unexecuted scenario passing.

## Documentation

Keep executable scenarios beside the behavior they explain when practical. Link existing guidance
instead of copying manuals. Keep comment prose lowercase and omit comments that only narrate obvious commands. Preserve
literal identifiers and command syntax. Scenario comment names should state the asserted behavior. Preserve the
meaning of source documentation when extracting tests; do not turn every fenced block into a test.
Use the [README](../../README.md) for onboarding and [API reference](../../API.md) only for library use.

## Testing

In an environment permitted by the repository guidance, use Leia to validate the smallest affected
scenario, then broaden only when the changed behavior warrants it. Keep the test command's failure status intact.

For authoring or extraction:

- Follow the title, level-two section, and fenced-block contract in [advanced usage](../../ADVANCED.md#author-a-scenario).
- Assert observable output, exit status, or file state. A zero exit alone proves only that the command
  completed; use an explicit comparison when the claimed result requires one.
- Commands in separate tests do not share shell variables or process state. Keep required operations
  in one test or communicate through scenario-owned files. Honor per-scenario working directories.
- Make setup repeatable and cleanup bounded. Avoid live services and credentials unless the behavior
  specifically needs them; record prerequisites when a scenario cannot run in the available environment.
- Where practical, demonstrate that a deliberately wrong expected result fails in a temporary copy,
  then run the correct scenario. Do not mutate the product just to test the assertion.

For failures, inspect the command output and distinguish product behavior, scenario defects, missing
prerequisites, shell differences, and invocation-directory/module-format errors. Repair only the
identified cause. Report interruption or unavailable environments separately from test failures.

## GitHub Actions

Project scenario automation belongs in `.github/workflows/leia.yml`, or the existing workflow that
already owns these tests. Adapt the complete [single-runner example](../../README.md#run-in-github-actions)
or [matrix example](../../GITHUB_ACTIONS.md#test-supported-platforms); do not add a duplicate job.
Use pull-request-only triggers and block-list matrix values. Omit obvious workflow comments.

Derive operating systems, Node versions, shells, install/build steps, and services from the project's
supported behavior. Leia needs Node 24 or newer; its published CLI does not require Bun. Keep the
matrix small and separate special shell or harness-format contracts when appropriate. Preserve
read-only permissions for tests and never execute untrusted PR code with privileged credentials.

Parse the finished YAML, check every matrix entry's prerequisites and scenario path, and run a
representative scenario only where repository guidance permits execution. Distinguish local validation from remote workflow results;
Windows or macOS support requires evidence from those environments. Publish or dispatch workflow
changes only within the user's authorization.

## Bundled Resources

- [CLI](../../CLI.md): invocation, options, environment defaults.
- [Advanced usage](../../ADVANCED.md): authoring, lifecycle, shell and format behavior.
- [GitHub Actions](../../GITHUB_ACTIONS.md): complete baseline and matrix guidance.
- [Plugin installation](../../PLUGINS.md): host setup and verification.

The package includes these Bash recipes:

- [Basic commands](../../examples/basic-example.md): naming, grouping, assertions, and skipped tests.
- [Setup and cleanup](../../examples/setup-cleanup-example.md): scenario-owned state and cleanup.
- [Custom headers](../../examples/custom-headers.md): selecting section prefixes through flags.
- [Relative files](../../examples/subdirectory-example/subdir-example.md): companion fixtures and working directories.

## Validation

- Confirm the scenario tests a supported observable contract and fails for the wrong result.
- Confirm cleanup touches only owned state and commands match the target shell and working directory.
- Confirm the selected CLI, dependency version, scenario paths, and CI configuration agree.
- Report checks actually run, failures, repairs, and skipped environments without claiming unobserved CI success.
