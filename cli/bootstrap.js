module.exports = async() => {
  const argv = require('@lando/argv');
  const debugNotSet = process.env.DEBUG === undefined || process.env.DEBUG === null || process.env.DEBUG === '';

  // Preserve debug setup before loading the command and its dependencies.
  if (debugNotSet && argv.hasOption('--debug')) {
    require('debug').enable(argv.getOption('--debug', {defaultValue: '*'}));
  }

  return require('./default.js').run().catch(require('@oclif/errors/handle'));
};
