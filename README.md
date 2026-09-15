# Leia

Leia turns fenced commands in Markdown into Mocha tests. It lets projects keep runnable examples
beside the prose they explain, then proves the documentation still tells the truth.

> Leia 2.0 is developed on the [`2.x`](https://github.com/lando/leia/tree/2.x) branch and requires
> Node.js 24 or newer. Stable 1.x maintenance remains on
> [`main`](https://github.com/lando/leia/tree/main). See [Migrating to Leia 2.0](./docs/migrating-to-2.md)
> before upgrading an existing project.

## Install

Install the 2.0 prerelease from npm's `edge` channel with
`npm install --save-dev @lando/leia@edge`. After the stable 2.0 release, omit `@edge`.

## Run your first scenario

Create `quickstart.md` in any npm project:

<!-- leia-example:quickstart-scenario -->

````md
# Leia quickstart

## Testing

```sh
# should print a greeting
echo "Hello from Leia"
```
````

Then run the locally installed binary:

<!-- leia-example:quickstart-command -->

```sh
npm exec --offline -- leia quickstart.md
```

Leia reports one passing test and exits with status `0`. A command that exits nonzero, cannot start,
or exceeds its deadline fails the scenario.

## Use Leia

Pass one or more files or glob patterns to the CLI. Quote globs so Leia, rather than the invoking
shell, expands them.

| Task                     | Command                                                      |
| ------------------------ | ------------------------------------------------------------ |
| Test one document        | `npm exec -- leia README.md`                                 |
| Test a documentation set | `npm exec -- leia "docs/**/*.md" --ignore "docs/archive/**"` |
| Retry failed commands    | `npm exec -- leia README.md --retry 2`                       |
| Set a 60-second deadline | `npm exec -- leia README.md --timeout 60`                    |
| Generate ESM harnesses   | `npm exec -- leia README.md --module-format esm`             |

A scenario needs a level-one title, a matching level-two test section, and a fenced block. Each
comment names the test below it; blank lines separate multiple tests. Setup and cleanup sections,
custom headers, shell selection, stdin, environment variables, skips, generated module formats, and
the complete CLI reference live in [Using Leia](./docs/using-leia.md).

Leia chooses a generated harness format once per invocation. `auto`, the default, walks upward from
the invocation directory to the nearest `package.json`: `"type": "module"` selects ESM and every
other readable package scope selects CommonJS. Use an explicit `--module-format` when automation
should not depend on package scope.

## Use the API

The package supports both ESM imports and CommonJS `require()` with TypeScript declarations for the
constructor and every public subpath. ESM consumers import the default `Leia` constructor from
`@lando/leia`; CommonJS consumers require the same package path.

Use `run()` for explicitly CommonJS harnesses. Use `await runAsync()` for ESM or automatic format
selection. See [Programmatic API](./docs/api.md) for complete runnable ESM and CommonJS examples,
public entrypoints, types, and the compiler pipeline.

## Understand execution

Leia runs commands from the directory containing their Markdown file. Setup, test, and cleanup
sections are ordered tests rather than hooks, so ordinary failures do not prevent later tests or
cleanup. Timeouts and caught termination signals stop the active process tree before Leia retries or
moves on.

Without `--stdin`, commands receive EOF. With it, they inherit the invoking input stream while
stdout and stderr remain captured. Normal status goes to stdout; warnings and actionable errors go
to stderr. Color is disabled for non-TTY and CI output, respects `NO_COLOR`, and can be forced with
`FORCE_COLOR`.

The [execution lifecycle](./docs/lifecycle.md) records the detailed process, signal, retry, and
cross-platform contract.

## Develop Leia

Leia 2.x uses the Bun version pinned in `.bun-version`, strict TypeScript ESM source, and Node 24 for
built-artifact compatibility. [Contributing](./CONTRIBUTING.md) covers the frozen install, canonical
scripts, source and build boundaries, tests, packaging, and releases. The
[compiler contract](./docs/compiler.md) documents the typed Markdown representation.

## Issues, questions, and support

For community help, join the [Lando Slack community](https://launchpass.com/devwithlando). Report
bugs and request features through the [issue queue](https://github.com/lando/leia/issues/new/choose).

User- and developer-visible changes are recorded in the [changelog](./CHANGELOG.md) and published
[release notes](https://github.com/lando/leia/releases).

## Maintainers

- [@pirog](https://github.com/pirog)
- [@reynoldsalec](https://github.com/reynoldsalec)

## Contributors

<a href="https://github.com/lando/leia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lando/leia" alt="Leia contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## License and policies

- [MIT License](./LICENSE)
- [Lando Terms of Use](https://docs.lando.dev/terms)
- [Lando Privacy Policy](https://docs.lando.dev/privacy)
- [Lando Code of Conduct](https://docs.lando.dev/coc)
