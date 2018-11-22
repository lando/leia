'use strict';

// Modules
const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

// Default headers
const setupHeaders = ['Start', 'Setup', 'This is the dawning'];
const testHeaders = ['Test', 'Validat', 'Verif'];
const cleanupHeaders = ['Clean', 'Tear', 'Burn'];

// Help things
const help = 'Translates properly formatted markdown files matched by <src> and exports cli mocha tests to <dest>\n';
const ex1 = chalk.green('Example 1: ') + 'leia "examples/*.md" test';
const ex2 = chalk.green('Example 2: ') + 'leia README.md test -p "examples/**/*.md" --retry 6 --test-header Tizzestin';
const ex3 = chalk.green('Example 3: ') + 'leia "examples/*.md" test --split-file --output-extension funky.js';
const describe = [help, ex1, ex2, ex3];

// Command
module.exports = {
  command: '$0 <src> <dest> [options]',
  describe: describe.join(os.EOL),
  builder: {
    'output-extension': {
      alias: 'o',
      describe: 'The extension of each exported test',
      default: 'func.js',
      string: true,
    },
    'pattern': {
      alias: 'p',
      describe: 'Scan these additional patterns',
      array: true,
    },
    'retry': {
      alias: 'r',
      describe: 'Retry each test this amount of times',
      default: 3,
      number: true,
    },
    'cleanup-header': {
      alias: 'c',
      describe: 'Sections that start with these headers are cleanup commands',
      default: cleanupHeaders,
      array: true,
    },
    'setup-header': {
      alias: 's',
      describe: 'Sections that start with these headers are setup commands',
      default: setupHeaders,
      array: true,
    },
    'split-file': {
      describe: 'Generate a splitfile',
      boolean: true,
    },
    'test-header': {
      alias: 't',
      describe: 'Sections that start with these headers are tests',
      default: testHeaders,
      array: true,
    },
  },
  handler: argv => {
    // Leia summoning
    // @NOTE: in the unlikely event we add more than the default command will we likely want
    // to kick the leia instantiation to the entrypoint and pass it into specific commands?
    const Leia = require('./../lib/leia');
    const leia = new Leia({logLevelConsole: argv.verbose});

    // Some advances loggin
    leia.log.verbose('Options %j', argv);
    leia.log.verbose('Ensuring diretory: %s exists', argv.dest);
    fs.mkdirpSync(argv.dest);

    // Combine all patterns and search for the things
    const files = leia.find(_.compact(_.flatten([argv.src, argv.pattern])));
    leia.log.info('Detected possible test source files: %s', files.join(', '));

    // Parse files into relevant test metadata
    const tests = leia.parse(files, argv);
    leia.log.info('Detected valid tests %s', _.map(tests, 'file').join(', '));
    leia.log.verbose('Full tests output %j', tests);

    // Generate test files from parsed data and return list of generated files
    const results = leia.generate(tests);
    leia.log.info('Generated mocha tests to %s', results.join(', '));

    // Generate a split file for CCI
    if (argv.splitFile === true) {
      fs.writeFileSync(path.join(argv.dest, 'split-file.txt'), results.join(os.EOL));
      leia.log.info('Writing split-file.txt to %s', argv.dest);
    }
  },
};

