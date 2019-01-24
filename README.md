Leia
====

Leia is a parsing utility designed to take specially formatted `markdown` files as input and export `cli` driven `mocha` tests. It is designed primarily to:

* Consolidate code examples and tests into a single, easy to understand and write `markdown` file
* Write functional tests quickly in an accessible and lowest common denominator language (eg `bash`)
* Pass on exit status code `0`, fail on anything else
* Work on `posix` eg **Windows is not currently supported**
* Keep [Lando](https://github.com/lando/lando) honest so he can be a real hero who doesn't betray his friends again

A __very__ basic example of what leia will do

```md
Some Example
============

Testing
------

# A description of my test
the command i am running
```

becomes

```js
/*
 * This file was automatically generated, editing it manually would be foolish
 *
 * See https://github.com/lando/leia for more
 * information on how all this magic works
 *
 * id: example
 * runs-from: ..
 */
// We need these deps to run our tezts
const chai = require('chai');
const CliTest = require('command-line-test');
const path = require('path');
chai.should();

// eslint-disable max-len

describe('example', function() {
  this.retries(3);

  // These tests are the main event
  // @todo: It would be nice to eventually get these into mocha after hooks
  // so they run after every test
  it('a description of my test', done => {
    process.chdir(path.resolve(__dirname, '..'));
    const cli = new CliTest();
    cli.exec('the command i am running').then(res => {
      if (res.error === null) {
        done();
      } else {
        done(res.error);
      }
    });
  });
});
```

Installing
----------

We recommend you use the [LTS 10.x](https://nodejs.org/en/) version of `nodejs` and the latest [yarn](https://yarnpkg.com). An easy way to get all the deps you need for `leia` is to look at the [Hyperdrive](https://github.com/lando/hyperdrive). **We do not recommend installing `leia` globally.**

```bash
yarn add leia-parser
```

Usage
-----

You can invoke `leia-parser` as a command line tool or directly require it in a module.

### CLI

```bash
yarn leia

leia.js <src> <dest> [options]

Translates properly formatted markdown files matched by <src> and exports cli mocha tests to <dest>

Example 1: leia "examples/*.md" test
Example 2: leia README.md test -p "examples/**/*.md" --retry 6 --test-header Tizzestin
Example 3: leia "examples/*.md" test --split-file --output-extension funky.js

Options:
  --version               Show version number                                                                                         [boolean]
  --verbose, -v           Change verbosity level                                                                                        [count]
  --help                  Show help                                                                                                   [boolean]
  --output-extension, -o  The extension of each exported test                                                     [string] [default: "func.js"]
  --pattern, -p           Scan these additional patterns                                                                                [array]
  --retry, -r             Retry each test this amount of times                                                            [number] [default: 3]
  --cleanup-header, -c    Sections that start with these headers are cleanup commands                [array] [default: ["Clean","Tear","Burn"]]
  --setup-header, -s      Sections that start with these headers are setup commands  [array] [default: ["Start","Setup","This is the dawning"]]
  --split-file            Generate a splitfile                                                                                        [boolean]
  --test-header, -t       Sections that start with these headers are tests                        [array] [default: ["Test","Validat","Verif"]]
```

### Module

```js
# Instantiate a new leia
const Leia = require('leia-parser');
const leia = new Leia({logLevelConsole: argv.verbose});

# Find some markdown files
const files = leia.find(['examples/**.md']);
# Parse those files into leia test metadata
const tests = leia.parse(files);
# Generate the mocha tests
const results = leia.generate(tests);
```

For more details on specific options check out the code docs

* [leia.find](https://github.com/lando/leia/blob/master/lib/find.js)
* [leia.generate](https://github.com/lando/leia/blob/master/lib/generate.js)
* [leia.parse](https://github.com/lando/leia/blob/master/lib/parse.js#L106)

Markdown Syntax
---------------

In order for your `markdown` file to be recognized as containing functional tests it needs to have at least the following

#### 1. A h1 Header

```md
Something to identify these tests
=================================
```

#### 2. A h2 Header

Our parser will look for a section that beings with the word "Testing". This section will contain your tests.

```md
Testing
-------
```

You can customize the word(s) that `leia` will look for to identify the testing section(s) using the `--test-header` option. You can also run `yarn leia --help` to get a list of default words.

#### 3. A code block with at least one command and comment

Under the above h2 sections you need to have a triple tick [markdown code block](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#code) that contains at least one comment and one command. The comment will be the human readable description of what the test does.

Here is a basic code block that runs one test

```bash
# Should cat a file
cat test.txt
```

If you want to learn more about the syntax and how `leia` puts together the above, check out [this example](https://github.com/lando/leia/blob/master/examples/basic-example.md)

Advanced Usage
--------------

Leia also allows you to specify additional h2 sections in your `markdown` for setup and cleanup commands that run before and after your core tests. You can tell `leia` what words these headers should start with in order to be flagged as setup and cleanup commands using the `--setup-header` and `--cleanup-header` options.

[Here](https://github.com/lando/leia/blob/master/examples/setup-cleanup-example.md) is an example of a markdown file with Setup, Testing and Cleanup sections.

Development
-----------

```bash
# Get the project
git clone https://github.com/lando/leia.git

# Install deps
yarn

# CLI
yarn leia
```

Testing
-------

Leia uses herself to do some basic functional tests. That means that this whole section is parsed into `mocha` tests that are run in Travis.

```bash
# Run linting
yarn lint

# Run unit tests
yarn test:unit

# Clean up previous test
rm -f test/leia.readme.js

# Get the version of Leia
yarn leia --version

# Generate tests from this README with some options
yarn leia README.md test -r 6 -o readme.js

# Validate the new test was created
cat test/leia.readme.js | grep "id: leia"

# Validate the retry was set correctly
cat test/leia.readme.js | grep retries | grep 6

# Validate we set some envars
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_RUNNING = \'true\';"
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_VERSION"
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_ID"
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_RETRY"
```

Releasing
---------

```bash
yarn release
```

Other Resources
---------------

* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
