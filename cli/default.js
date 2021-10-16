const {Command, flags} = require('@oclif/command');

const chalk = require('chalk');

class LeiaCommand extends Command {
  static id = 'leia';
  static description = 'Cleverly converts markdown files into mocha cli tests';
  static usage = '<source> <dest> [options]';
  static examples = [
    'leia "examples/*.md" test',
    'leia README.md test -p "examples/**/*.md" -p "other/RANDO.md" --retry 6 --test-header Tizzestin',
    'leia "examples/*.md" test --split-file --output-extension funky.js',
    'leia "*.md" --ignore BUTNOTYOU.md test --stdin',
  ];

  static args = [
    // @NOTE: source is required but we dont set that here so we can catch downstream and
    // print help along with the requirement message
    {name: 'source', description: 'A file or pattern to scan for test sources'},
    {name: 'destination', default: 'test', description: 'The output directory of the generated tests'},
  ];

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

    // Additional include/exclusion options
    'pattern': flags.string({
      char: 'p',
      description: 'additional files or patterns to scan',
      multiple: true,
    }),
    'ignore': flags.string({
      char: 'i',
      description: 'files or patterns to ignore',
      multiple: true,
    }),

    // Other options
    'output-extension': flags.string({
      char: 'o',
      description: 'the extension of the resulting test',
      default: 'leia.js',
    }),
    'retry': flags.string({
      char: 'r',
      description: 'the amount of retries a failing test should get',
      default: 1,
    }),
    'split-file': flags.boolean({
      description: 'also generate a split file for things like CircleCI',
    }),
    'stdin': flags.boolean({
      description: 'attach stdin when the test is run',
    }),

    // Legacy flags that still work if you pass them in but are no longer shown in help or documented
    //
    // @NOTE: --spawn is the default/only option now so the inclusion below is just so existing leia usage out in the
    // wild doesnt start erroring on an upgrade
    'spawn': flags.boolean({hidden: true}),
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
    const debug = require('debug')('leia/cli:default');
    const fs = require('fs-extra');
    debug('starting default command execution');

    // Grab flags and args
    const {args, flags} = this.parse(LeiaCommand);

    // If source is nill then show help and throw error
    // @NOTE: this doesnt feel like exactly right usage but it was better than the default
    if (_.isNil(args.source)) this._help();

    // Combine our args and options into a parsed anc camelCase-keyed object
    const argv = _(_.toPairs(_.merge({}, flags, args)))
      .map((pair) => ([_.camelCase(pair[0]), pair[1]]))
      .fromPairs()
      .value();

    // Summon leia to do the things
    const Leia = require('./../lib/leia');
    const leia = new Leia();

    // Some advances loggin
    debug('OPTIONS: %o', flags);
    debug('ARGS: %o', args);
    debug('ARGV: %o', argv);
    debug('Ensuring directory: %s exists', argv.destination);
    fs.mkdirpSync(argv.destination);

    // Combine all patterns and search for the things
    const files = leia.find(_.compact(_.flatten([argv.source, argv.pattern])), argv.ignore);
    this.log('Detected possible test source files: %s', files.join(', '));

    // Combine our args and options
    const tests = leia.parse(files, argv);
    this.log('Detected valid tests %s', _.map(tests, 'file').join(', '));

    // Generate test files from parsed data and return list of generated files
    const results = leia.generate(tests);
    this.log('Generated mocha tests to %s', results.join(', '));

    // Generate a split file for CCI
    if (argv.splitFile === true) {
      fs.writeFileSync(path.join(argv.destination, 'split-file.txt'), results.join(os.EOL));
      this.log('Writing split-file.txt to %s', argv.destination);
    }
  }
}

module.exports = LeiaCommand;
