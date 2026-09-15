# Leia

Leia is a testing utility that tests code blocks in documentation. This makes tests easy to write and also ensures documentation is up to date and working. Behind the scenes documentation is parsed and run as a series of `mocha` tests.

Leia will

- Consolidate code examples and tests into a single, easy to understand and write `markdown` file
- Write functional tests quickly in an accessible and lowest common denominator language (eg `sh/bash/dash` etc)
- Pass on exit status code `0`, fail on anything else
- Work cross platform-ish, with some caveats, see [Shell Considerations](#shell-considerations) below
- Keep [Lando](https://github.com/lando/lando) honest so he can be a real hero who doesn't betray his friends again

## Installation

Leia 1.x requires Node.js 24 or newer.

```bash
# With npm
npm install @lando/leia
```

## Basics

A basic Leia test needs one H1 heading, at least one matching H2 test heading, and a fenced code block.
Inside the code block, a comment describes the test and the following line runs its command.

````md
# Some Example

## Testing

```bash
# Should print a greeting
echo "Hello from Leia"
```
````

## Usage

You can invoke `leia` as a command line tool or directly `require` it in a module.

### CLI

```bash
# Run every Leia scenario in the README.
npx leia README.md

# Scan documentation while excluding an archived subtree.
npx leia "docs/**/*.md" --ignore "docs/archive/**"

# Select explicit retry, timeout, and generated-module behavior.
npx leia README.md --retry 2 --timeout 60 --module-format esm
```

Run `npx leia --help` for the complete option reference and current defaults. Leia writes run and
completion status to stdout and warnings and actionable errors to stderr. Color is disabled for
non-TTY and CI output, honors `NO_COLOR`, and can be explicitly controlled with `FORCE_COLOR`.

`--retry` and `--timeout` accept non-negative integers. Retry counts may not exceed JavaScript's safe-integer limit;
timeouts may not exceed `2147483` seconds so their millisecond conversion remains within Node's timer range. Leia rejects
invalid, fractional, or out-of-range values before generating or loading a harness.

The legacy `--spawn` and `--split-file` flags remain accepted as no-ops for 1.x command compatibility.
Leia 2.0 warns when either is supplied; remove them after every environment uses Leia 2.0.

### Execution lifecycle

The 2.x development CLI runs directly with `bun run leia`; `bun run build` produces the equivalent
Node ESM CLI at `dist/esm/bin/leia.js` and CommonJS CLI at `dist/cjs/bin/leia.cjs`. Flags, aliases, header matching, Mocha reporting, and per-test retries
retain their 1.x behavior. Setup and cleanup remain ordered tests, not per-test hooks. The old root
`bin/leia` launcher and `lib/` adapters are removed; package entrypoints now target `dist/` directly.

A nonzero exit, spawn error, or timeout fails an attempt. Leia terminates the command's process tree
before retrying or continuing to cleanup. `--timeout=0` disables deadlines. Without `--stdin`, commands
receive EOF; with it, they inherit the invoking input stream, including a terminal when one exists.
Output remains captured through pipes in both cases.

On POSIX, `SIGINT`, `SIGTERM`, and `SIGHUP` cancel active setup/test commands, skip remaining
setup/tests, and run cleanup. The CLI then exits with 130, 143, or 129 respectively. A second signal,
or a signal during cleanup, cancels cleanup. Uncatchable termination cannot guarantee cleanup.
See the [lifecycle contract](./docs/lifecycle.md) for platform details and verification.

### Module

```js
// require() selects the CommonJS build and returns the Leia constructor.
const Leia = require('@lando/leia');
const leia = new Leia();

async function main() {
  const files = leia.find(['examples/**.md']);
  const sources = leia.parse(files, {moduleFormat: 'auto'});
  const tests = leia.generate(sources);

  // runAsync loads either CommonJS or ESM harnesses before returning Mocha.
  const runner = await leia.runAsync(tests);
  runner.run((failures) => process.exitCode = failures ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

The synchronous CommonJS API remains available when the format is explicitly known:

```js
const Leia = require('@lando/leia');
const leia = new Leia();
const files = leia.find(['examples/**.md']);
const sources = leia.parse(files, {moduleFormat: 'commonjs'});
const tests = leia.generate(sources);
const runner = leia.run(tests);
runner.run((failures) => process.exitCode = failures ? 1 : 0);
```

The root supports both `import Leia from '@lando/leia'` and `const Leia = require('@lando/leia')`.
Use explicit subpaths to compose the library without constructing Leia:

```js
import {find} from '@lando/leia/find';
import {parse} from '@lando/leia/parse';
import {generate} from '@lando/leia/generate';

const tests = generate(parse(find(['docs/**/*.md']), {moduleFormat: 'esm'}));
```

| Entry point                 | Public exports                                                             |
| --------------------------- | -------------------------------------------------------------------------- |
| `@lando/leia`               | Default/named `Leia` constructor and existing instance methods             |
| `@lando/leia/find`          | `find`                                                                     |
| `@lando/leia/parse`         | `parse`, `readMarkdown`, `normalizeMarkdown`, `normalizeCommand`           |
| `@lando/leia/generate`      | `generate`, `compileHarness`                                               |
| `@lando/leia/run`           | `run`, `runAsync`, `exitCode`                                              |
| `@lando/leia/shell`         | `getShell`                                                                 |
| `@lando/leia/module-format` | `resolveModuleFormat`, `formats`                                           |
| `@lando/leia/compiler`      | The discovery, parsing, generation, shell, and module-format exports above |
| `@lando/leia/package.json`  | Package metadata                                                           |

Every JavaScript entry point has separate ESM and CommonJS artifacts and TypeScript declarations.
CommonJS subpaths use named properties, such as `const {find} = require('@lando/leia/find')`.
Types such as `ParseOptions`, `Harness`, `GenerateOptions`, `GeneratedHarness`, `RunOptions`,
`Shell`, and `ModuleFormat` are exported beside their functions; the compiler entry point also
exports its shared representation types. TypeScript consumers should use `node16` or `nodenext`
module resolution. Bun and Leia's development dependencies are not required to use the package.

`find` discovers files; `readMarkdown` reads them; `parse` and `normalizeMarkdown` resolve shell,
package, and dependency paths into the [compiler representation](./docs/compiler.md).
`compileHarness` validates and renders without writing; `generate` also writes harnesses and
executable scripts. `run` creates a Mocha instance, and `runAsync` additionally loads its files;
call the returned runner's `.run()` to execute tests. `exitCode` preserves Leia's signal exit codes.

Only the listed package paths are supported. Deep imports through `lib/`, `utils/`, or `dist/`
and CLI implementation imports are private. The `leia` binary remains the supported CLI surface.

### Module formats

`--module-format` and the programmatic `moduleFormat` option accept `auto`, `commonjs`, or `esm`. The default `auto`
selection starts from the command's initial working directory and walks upward to the nearest `package.json`. A package
with `"type": "module"` selects ESM; `"type": "commonjs"`, an absent `type`, or no package file selects CommonJS. Leia
reports an unreadable or malformed nearest package file instead of silently guessing. An explicit format always overrides
package detection, and one resolved format applies to every Markdown source in an invocation.

CommonJS harnesses use `.leia.cjs`; ESM harnesses use `.leia.mjs`. These extensions make the generated format independent
of the temporary directory's enclosing package scope. ESM harnesses load Leia's CommonJS dependencies through Node's
`createRequire`; Leia's implementation is TypeScript ESM, independent of the generated format. Projects that added a nested `package.json` containing
`{"type":"commonjs"}` only to protect Leia's old `.leia.js` output may remove that workaround after upgrading.

Use `leia.run()` for explicitly CommonJS harnesses. Use `await leia.runAsync()` for `auto` or ESM workflows; it supports
both formats and loads native ESM through Mocha's asynchronous loader.

## Markdown Syntax

For a Markdown file to be recognized as containing functional tests, it needs at least the following:

### 1. An H1 heading

```md
# Something to identify these tests
```

### 2. An H2 test heading

By default, Leia looks for sections beginning with "Testing". These sections contain your tests.

```md
## Testing
```

Customize the words Leia uses to identify test sections with `--test-header`. Run `npx leia --help` to see the defaults.

### 3. A fenced code block with a comment and command

Under a matching H2 heading, add a fenced code block containing at least one comment and one command. The
comment becomes the human-readable test description.

Here is a basic code block that runs one test

```bash
# Should cat a file
cat test.txt
```

For more syntax examples, see the [basic executable example](https://github.com/lando/leia/blob/main/examples/basic-example.md).

## Skipping

You can also skip tests. This is useful if you want to stub out a test for later.

```bash
# Should write this test later and not forget it
skip
```

## Environment Variables

`leia` will also set the following environment variables for each test that is running so you can use them for stuff.

Here are the values you would expect for the `Should set envvars with the test number` test in `examples/environment.md` running on Leia version `v1.0.0` with `--retry=1`.

```bash
# generic vars
LEIA=true
LEIA_ENVIRONMENT=true
LEIA_VERSION=1.0.0

# test vars
LEIA_TEST_RUNNING=true
LEIA_TEST_ID=environment
LEIA_TEST_NUMBER=4
LEIA_TEST_RETRY=1
LEIA_TEST_STAGE=test
```

Note: `LEIA_TEST_STAGE` can be either `setup`, `test` or `cleanup` and `LEIA_TEST_NUMBER` resets to `1` for each `LEIA_TEST_STAGE`.

## Shell considerations

When `--shell` is omitted, `leia` selects a shell with deterministic platform precedence:

- On Windows, `SHELL` wins, followed by `MSYSTEM=MINGW64` using `bash.exe`, `COMSPEC`, and finally `cmd.exe`.
- On macOS and other Unix systems, the account shell from `os.userInfo()` wins, followed by `SHELL`. The final fallback is
  `/bin/zsh` on macOS and `/bin/sh` elsewhere.

Unix account lookup failures are reported instead of silently changing the selected shell. An unrecognized selected shell
still uses Leia's supported `sh` behavior.

You can also explicitly tell `leia` what shell to use with the `--shell` option. However, currently only `bash`, `sh`, `zsh`, `cmd`, `powershell` and `pwsh` are supported options.

**In most use cases it's best to just let `leia` decide the shell to use automatically.**

## Advanced Usage

Leia also allows you to specify additional h2 sections in your `markdown` for setup and cleanup commands that run before and after your core tests. You can tell `leia` what words these headers should start with in order to be flagged as setup and cleanup commands using the `--setup-header` and `--cleanup-header` options.

[Here](https://github.com/lando/leia/blob/main/examples/setup-cleanup-example.md) is an example of a markdown file with Setup, Testing and Cleanup sections. And [here](https://github.com/lando/leia/blob/main/examples) is a whole directory of examples that we test on every commit.

## Issues, Questions and Support

If you have a question or would like some community support we recommend you [join us on Slack](https://launchpass.com/devwithlando). Note that this is the Slack community for [Lando](https://lando.dev) but we are more than happy to help with this module as well!

If you'd like to report a bug or submit a feature request then please [use the issue queue](https://github.com/lando/leia/issues/new/choose) in this repo.

## Changelog

User- and developer-visible changes are recorded in the
[changelog](https://github.com/lando/leia/blob/main/CHANGELOG.md) and published
[release notes](https://github.com/lando/leia/releases).

## Development

Leia 2.x development uses the Bun version pinned in `.bun-version`, strict TypeScript ESM source,
and `bun.lock`. Node 24 from `.node-version` remains available for compatibility tests and built JavaScript.
See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, canonical validation commands, source CLI execution,
watch mode, and migration boundaries. The [compiler contract](./docs/compiler.md) documents the typed
Markdown/scenario representation and preserved command behavior. In a source checkout, run `bun run build`
before the Node CLI or CommonJS API; Bun runs the TypeScript source directly. Installed-package commands
above remain npm/Node commands.

## Releasing

To deploy and publish a new version of the package to the `npm` registry, [create a release on GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) with a [semver](https://semver.org) tag. Prereleases publish to npm's `edge` tag. Releases not marked as prereleases publish directly to `latest` and also update `edge` to that version, regardless of the version string.

The `@lando/leia` package must trust the `lando/leia` GitHub Actions publisher using `release.yml`. Package publication uses OIDC without an npm token. `NPM_DEPLOY_TOKEN` is a granular package token used only to update the `edge` dist-tag after stable publication, while `prepare-release-action` synchronizes the version and changelog.

## Maintainers

- [@pirog](https://github.com/pirog)
- [@reynoldsalec](https://github.com/reynoldsalec)

## Contributors

<a href="https://github.com/lando/leia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lando/leia" />
</a>

Made with [contributors-img](https://contrib.rocks).

## Legacy Version

You can still install the older version of Leia eg `leia-parser`.

```bash
npm install leia-parser
```

And its documentation lives on [here](https://github.com/lando/leia/tree/v0.4.0).

## Other Resources

- [LICENSE](/LICENSE)
- [TERMS OF USE](https://docs.lando.dev/terms)
- [PRIVACY POLICY](https://docs.lando.dev/privacy)
- [CODE OF CONDUCT](https://docs.lando.dev/coc)
