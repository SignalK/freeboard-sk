#!/usr/bin/env node
var log = require('npmlog');
var parser = require('nomnom');

var deps = require('../lib/deps');
var build = require('../lib/build');
var serve = require('../lib/serve');

parser.options({
  loglevel: {
    abbr: 'l',
    choices: ['silly', 'verbose', 'info', 'warn', 'error'],
    default: 'info',
    help: 'Log level',
    metavar: 'LEVEL'
  }
});

parser.command('update-compiler').callback(function() {
  deps.updateCompiler(function(err, dir) {
    if (err) {
      log.error('closure-util', err.message);
      process.exit(1);
    }
    process.exit(0);
  });
}).help('Update the Compiler');

parser.command('update-library').callback(function() {
  deps.updateCompiler(function(err, dir) {
    if (err) {
      log.error('closure-util', err.message);
      process.exit(1);
    }
    process.exit(0);
  });
}).help('Update the Library');

parser.command('update').callback(function() {
  var done = 0;
  deps.updateCompiler(function(err, dir) {
    if (err) {
      log.error('closure-util', err.message);
      process.exit(1);
    }
    done += 1;
    if (done === 2) {
      process.exit(0);
    }
  });
  deps.updateLibrary(function(err, dir) {
    if (err) {
      log.error('closure-util', err.message);
      process.exit(1);
    }
    done += 1;
    if (done === 2) {
      process.exit(0);
    }
  });
}).help('Update both the Library and the Compiler');

parser.command('build')
  .option('config', {
    position: 1,
    required: true,
    help: 'Path to JSON config file'
  })
  .option('output', {
    position: 2,
    required: true,
    help: 'Output file path'
  })
  .callback(function(opts) {
    var configFile = opts.config;
    var outputFile = opts.output;
    build(configFile, outputFile, function(err) {
      if (err) {
        log.error('closure-util', err.message);
        process.exit(1);
      }
      process.exit(0);
    });
  }).help('Build with Closure Compiler');

parser.command('serve')
  .option('config', {
    position: 1,
    required: true,
    help: 'Path to JSON config file'
  })
  .callback(function(opts) {
    var configFile = opts.config;
    serve(configFile, function(err) {
      if (err) {
        log.error('closure-util', err.message);
        process.exit(1);
      }
    });
  }).help('Start the development server');

var options = parser.parse();

/**
 * Configurable log level.
 * @type {string}
 */
log.level = options.loglevel;
