const {Command, flags} = require('@oclif/command');

const chalk = require('chalk');
const shell = require('../lib/shell.js');

class LeiaCommand extends Command {
  static id = 'leia';
  static description = 'Cleverly converts markdown files into mocha cli tests';
  static usage = `<files> <patterns> \
[--cleanup-header=<cleanup-headers>] \
[--debug] \
[--help] \
[--ignore=<patterns>] \
[--retry=<count>] \
[--setup-header=<setup-headers>] \
[--test-header=<test-headers>] \
[--shell=<bash|cmd|powershell|pwsh|sh|zsh>] \
[--stdin] \
[--version]`;
  static strict = false;
  static examples = [
    'leia README.md',
    'leia README.md "examples/**/*.md" --retry 6 --test-header Tizzestin',
    'leia "examples/*.md" --ignore BUTNOTYOU.md test --stdin',
    'leia README.md --shell cmd',
  ];

  static args = [{name: 'tests', description: 'files or patterns to scan for test'}];

  static flags = {
    // Plugin commands and placeholder --debug for use with @lando/argv
    'debug': flags.boolean({description: 'show debug output'}),
    'help': flags.help({char: 'h'}),
    'version': flags.version({char: 'v'}),

    // Setup header
    'setup-header': flags.string({
      char: 's',
      description: 'sections that start with these headers are setup commands',
      multiple: true,
      default: ['Start', 'Setup', 'This is the dawning'],
    }),
    // Test header
    'test-header': flags.string({
      char: 't',
      description: 'sections that start with these headers are tests',
      multiple: true,
      default: ['Test', 'Validat', 'Verif'],
    }),
    // Cleanup header
    'cleanup-header': flags.string({
      char: 'c',
      description: 'sections that start with these headers are cleanup commands',
      multiple: true,
      default: ['Clean', 'Tear', 'Burn'],
    }),

    // Additional options
    'ignore': flags.string({
      char: 'i',
      description: 'files or patterns to ignore',
      multiple: true,
    }),
    'retry': flags.string({
      char: 'r',
      description: 'the amount of retries a failing test should get',
      default: 1,
    }),
    'shell': flags.string({
      default: shell().binary,
      description: 'the shell to use for the tests, default is autodetected',
      options: ['bash', 'cmd', 'powershell', 'pwsh', 'sh', 'zsh'],
    }),
    'stdin': flags.boolean({
      description: 'attach stdin when the test is run',
    }),

    // Legacy flags that still work if you pass them in but are no longer shown in help or documented
    //
    // @NOTE: --spawn is the default/only option now so the inclusion below is just so existing leia usage out in the
    // wild doesnt start erroring on an upgrade
    'spawn': flags.boolean({hidden: true}),
    'split-file': flags.boolean({hidden: true}),
  }

  // Override warn for chalkability of string input
  warn(input, options) {
    if (typeof input === 'string') input = chalk.yellow(input);
    super.warn(input, options);
  }

  // Override warn for chalkability of string input
  error(input, options) {
    if (typeof input === 'string') input = chalk.red(input);
    super.error(input, options);
  }

  // The stuff that runs
  async run() {
    // Get modules and stuff
    // @NOTE: we do this here so we dont need to load big things like lodash just to show the CLI
    const _ = require('lodash');
    const debug = require('debug')('leia:cli');
    debug('starting default command execution');

    // Grab all teh things
    const {args, argv, flags} = this.parse(LeiaCommand);
    // Set args.files to argv
    args.tests = argv;

    // If source is nill then show help and throw error
    // @NOTE: this doesnt feel like exactly right usage but it was better than the default
    if (_.isEmpty(args.tests)) this._help();

    // Combine our args and options into a parsed and camelCase-keyed object
    const options = _(_.toPairs(_.merge({}, flags, args)))
      .map((pair) => ([_.camelCase(pair[0]), pair[1]]))
      .fromPairs()
      .value();


    // make sure we split any headers that need to be split
    ['setupHeader', 'testHeader', 'cleanupHeader'].forEach((header) => {
      if (options[header].length === 1) options[header] = options[header][0].split(',');
    });

    // Summon leia to do the things
    const Leia = require('./../lib/leia');
    const leia = new Leia();

    // Some advanced kenny loggins
    debug('leia parsed args and flags into options: %o', options);

    // Combine all patterns and search for the things
    const files = leia.find(options.tests, options.ignore);
    debug('detected possible test source files: %s', files.join(', '));

    // Combine our args and options
    const sources = leia.parse(files, options);
    debug('detected valid test sources %s', _.map(sources, 'file').join(', '));

    // Generate test files from parsed data and return list of generated files
    const tests = leia.generate(sources);
    debug('generated leia tests to %s', tests.join(', '));

    // Get the test runner and execute
    const runner = leia.run(tests);
    runner.run((failures) => {
      debug('tests completed with %s failures', failures);
      process.exitCode = failures ? 1 : 0;
    });
  }
}

module.exports = LeiaCommand;
