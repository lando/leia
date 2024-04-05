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
  $ leia <files> <patterns> [options]

ARGUMENTS
  TESTS  files or patterns to scan for test

OPTIONS
  -c, --cleanup-header=cleanup-header  [default: Clean,Tear,Burn] sections that start with these headers are cleanup commands
  -h, --help                           show CLI help
  -i, --ignore=ignore                  files or patterns to ignore
  -r, --retry=retry                    [default: 1] the amount of retries a failing test should get
  -s, --setup-header=setup-header      [default: Start,Setup,This is the dawning] sections that start with these headers are setup commands
  -t, --test-header=test-header        [default: Test,Validat,Verif] sections that start with these headers are tests
  -v, --version                        show CLI version
  --debug                              show debug output
  --shell=shell                        the shell to use for the tests, default is autodetected
  --stdin                              attach stdin when the test is run

EXAMPLES
  leia README.md
  leia README.md "examples/**/*.md" --retry 6 --test-header Tizzestin
  leia "examples/*.md" --ignore BUTNOTYOU.md test --stdin
  leia README.md --shell cmd
```

### Module

```js
# Instantiate a new leia
const Leia = require('@lando/leia');
const leia = new Leia();

// Find some tests
const files = leia.find(['examples/**.md']);
// Parse those files into leia test metadata
const sources = leia.parse(files);
// Generate the mocha tests
const tests = leia.generate(sources);
// Run the tests
const runner = leia.run(tests);
runner.run((failures) => process.exitCode = failures ? 1 : 0);
```

For more details on specific options check out the code docs

* [leia.find](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.generate](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.parse](https://github.com/lando/leia/blob/main/lib/leia.js)
* [leia.run](https://github.com/lando/leia/blob/main/lib/leia.js)

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

`leia` will autodetect your shell and use a `bashy` one if available.

* On POSIX systems it will prefer `bash` or `zsh` if available with a fallback to `sh`.
* On Windows systems it will prefer `bash` if available with a fallback to `cmd`.

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

* Requires [Node 18+](https://nodejs.org/dist/latest-v18.x/)

```bash
git clone https://github.com/lando/leia.git && cd leia
npm install
```

If you dont' want to install Node 18 for whatever reason you can install [Lando](https://docs.lando.dev/basics/installation.html) and use that:

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

* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
