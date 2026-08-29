# Leia

Leia is a testing utility that tests code blocks in documentation. This makes tests easy to write and also ensures documentation is up to date and working. Behind the scenes documentation is parsed and run as a series of `mocha` tests.

Leia will

* Consolidate code examples and tests into a single, easy to understand and write `markdown` file
* Write functional tests quickly in an accessible and lowest common denominator language (eg `sh/bash/dash` etc)
* Pass on exit status code `0`, fail on anything else
* Work cross platform-ish, with some caveats, see [Shell Considerations](#shell-considerations) below
* Keep [Lando](https://github.com/lando/lando) honest so he can be a real hero who doesn't betray his friends again

## Installation

```bash
# With npm
npm install @lando/leia
```

## Basics

A _very_ basic example of a valid Leia test is below. It _must_ have a single H1 header, at least one H2 header and then a code block
where the comment is the human readable test description and the command below is the test.

```md
# Some Example

## Testing

# A description of my test
the command i am running
```

## Usage

You can invoke `leia` as a command line tool or directly `require` it in a module.

### CLI

```bash
npx leia

Cleverly converts markdown files into mocha cli tests

USAGE
  $ leia <files> <patterns> [--cleanup-header=<cleanup-headers>] [--debug] [--help] [--ignore=<patterns>]
  [--module-format=<auto|commonjs|esm>] [--retry=<count>] [--setup-header=<setup-headers>]
  [--test-header=<test-headers>] [--shell=<bash|cmd|powershell|pwsh|sh|zsh>] [--stdin] [--timeout=<seconds>]
  [--version]

ARGUMENTS
  TESTS  files or patterns to scan for test

OPTIONS
  -c, --cleanup-header=cleanup-header      [default: Clean,Tear,Burn] considers these h2 sections as cleanup commands
  -i, --ignore=ignore                      files or patterns to ignore
  --module-format=auto|commonjs|esm        [default: auto] generates CommonJS or ESM harnesses, autodetected by default
  -r, --retry=retry                        [default: 1] non-negative number of times to retry each test
  -s, --setup-header=setup-header          [default: Start,Setup,This is the dawning] considers these h2 sections as setup commands
  -t, --test-header=test-header            [default: Test,Validat,Verif] considers these h2 sections as tests
  -v, --version                            shows version info
  --debug                                  shows debug output
  --help                                   shows help
  --shell=bash|cmd|powershell|pwsh|sh|zsh  [default: /opt/homebrew/bin/zsh] runs tests with given shell, autodetected by default
  --stdin                                  attachs stdin when the test is run
  --timeout=timeout                        [default: 1800] non-negative whole seconds before tests time out (max 2147483)

EXAMPLES
  leia README.md
  leia README.md "examples/**/*.md" --retry 6 --test-header Tizzestin
  leia "examples/*.md" --ignore BUTNOTYOU.md test --stdin --timeout 5
  leia README.md --shell cmd
  leia README.md --module-format esm
```

`--retry` and `--timeout` accept non-negative integers. Retry counts may not exceed JavaScript's safe-integer limit;
timeouts may not exceed `2147483` seconds so their millisecond conversion remains within Node's timer range. Leia rejects
invalid, fractional, or out-of-range values before generating or loading a harness.

### Module

```js
// Instantiate Leia, which remains a CommonJS package.
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

For more details on specific options check out the code docs

* [leia.find](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.generate](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.parse](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.resolveModuleFormat](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.run](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.runAsync](https://github.com/lando/leia/blob/main/lib/leia.js)

### Module formats

`--module-format` and the programmatic `moduleFormat` option accept `auto`, `commonjs`, or `esm`. The default `auto`
selection starts from the command's initial working directory and walks upward to the nearest `package.json`. A package
with `"type": "module"` selects ESM; `"type": "commonjs"`, an absent `type`, or no package file selects CommonJS. Leia
reports an unreadable or malformed nearest package file instead of silently guessing. An explicit format always overrides
package detection, and one resolved format applies to every Markdown source in an invocation.

CommonJS harnesses use `.leia.cjs`; ESM harnesses use `.leia.mjs`. These extensions make the generated format independent
of the temporary directory's enclosing package scope. ESM harnesses load Leia's CommonJS dependencies through Node's
`createRequire`, so Leia's own package and source remain CommonJS. Projects that added a nested `package.json` containing
`{"type":"commonjs"}` only to protect Leia's old `.leia.js` output may remove that workaround after upgrading.

Use `leia.run()` for explicitly CommonJS harnesses. Use `await leia.runAsync()` for `auto` or ESM workflows; it supports
both formats and loads native ESM through Mocha's asynchronous loader.

## Markdown Syntax

In order for your `markdown` file to be recognized as containing functional tests it needs to have at least the following

#### 1. A h1 Header

```md
# Something to identify these tests
```

#### 2. A h2 Header

By default our parser will look for a section that beings with the word "Testing". This section will contain your tests.

```md
## Testing
```

You can customize the word(s) that `leia` will look for to identify the testing section(s) using the `--test-header` option. You can also run `npm leia --help` to get a list of default words.

#### 3. A code block with at least one command and comment

Under the above h2 sections you need to have a triple tick [markdown code block](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#code) that contains at least one comment and one command. The comment will be the human readable description of what the test does.

Here is a basic code block that runs one test

```bash
# Should cat a file
cat test.txt
```

If you want to learn more about the syntax and how `leia` puts together the above, check out [this example](https://github.com/lando/leia/blob/main/examples/basic-example.md)

## Skipping

You can also skip tests. This is useful if you want to stub out a test for later.

```bash
# Should write this test later and dont want to forget it
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

* On Windows, `SHELL` wins, followed by `MSYSTEM=MINGW64` using `bash.exe`, `COMSPEC`, and finally `cmd.exe`.
* On macOS and other Unix systems, the account shell from `os.userInfo()` wins, followed by `SHELL`. The final fallback is
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

We try to log all changes big and small in both [THE CHANGELOG](https://github.com/lando/leia/blob/main/CHANGELOG.md) and the [release notes](https://github.com/lando/leia/releases).

## Development

Leia development requires [Node 24 LTS](https://nodejs.org/dist/latest-v24.x/). The root `.node-version` is the runtime authority for version-aware local tooling and GitHub Actions.

```bash
git clone https://github.com/lando/leia.git && cd leia
npm install
```

If you don't want to install Node 24 locally, you can install [Lando](https://docs.lando.dev/basics/installation.html) and use that:

```bash
git clone https://github.com/lando/leia.git && cd leia
# Install deps and get node
lando start

# Run commands
lando node
lando npm install
lando npx leia
```

## Testing

```bash
# Lint the code
npm run lint

# Run unit tests
npm run test:unit
```

## Releasing

To deploy and publish a new version of the package to the `npm` registry you need only [create a release on GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) with a [semver](https://semver.org) tag.

Note that prereleases will get pushed to the `edge` tag on the `npm` registry.

The `@lando/leia` package must trust the `lando/leia` GitHub Actions publisher using `release.yml`. Publishing uses OIDC; `NPM_DEPLOY_TOKEN` is retained only for `npm dist-tag` promotion and should be a granular token scoped to this package.

## Maintainers

* [@pirog](https://github.com/pirog)
* [@reynoldsalec](https://github.com/reynoldsalec)

## Contributors

<a href="https://github.com/lando/leia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lando/leia" />
</a>

Made with [contributors-img](https://contrib.rocks).

## Legacy Version

You can still install the older version of  Leia eg `leia-parser`.

```bash
npm install leia-parser
```

And its documentation lives on [here](https://github.com/lando/leia/tree/v0.4.0).

## Other Resources

* [LICENSE](/LICENSE)
* [TERMS OF USE](https://docs.lando.dev/terms)
* [PRIVACY POLICY](https://docs.lando.dev/privacy)
* [CODE OF CONDUCT](https://docs.lando.dev/coc)
