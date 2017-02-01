var async = require('async');
var log = require('npmlog');

var config = require('./config');
var configfile = require('./configfile');
var manager = require('./manager');
var server = require('./server');


/**
 * Configurable log level.
 * @type {string}
 */
log.level = config.get('log_level');


/**
 * Read the build configuration file.
 * @param {string} configFile Config file.
 * @param {function(Error, Object)} callback Called with the build
 *    configuration object or any error.
 */
function readConfig(configFile, callback) {
  log.info('closure-util', 'Reading build config');
  configfile.readConfig(configFile, callback);
}


/**
 * Assert that a provided config object is valid.
 * @param {Object} config Build configuration object.
 * @param {function(Error, Object)} callback Called with the configuration
 *     object or any error.
 */
function assertValidConfig(config, callback) {
  process.nextTick(function() {
    if (!config.lib) {
      config.lib = config.src;
    }
    if (!Array.isArray(config.lib)) {
      callback(new Error('Config "lib" must be an array'));
      return;
    }
    callback(null, config);
  });
}


/**
 * Create a development server.
 * @param {Object} config The configuration object.
 * @param {function(Error, closure.Server)} callback Callback.
 */
function createServer(config, callback) {
  var srv;
  var mgr = new manager.Manager({
    lib: config.lib
  });
  mgr.on('error', function(err) {
    if (server) {
      log.error('serve', err.message);
    } else {
      callback(err);
    }
  });
  mgr.on('ready', function() {
    srv = new server.Server({
      manager: mgr
    });
    callback(null, config, srv);
  });
}


/**
 * @param {Object} config The configuration object.
 * @param {closure.Server} server The server.
 * @param {function(Error)} callback Callback with an error, if any.
 */
function listen(config, server, callback) {
  var port = config.serve && config.serve.port ?
      config.serve.port : 3000;
  server.listen(port, function() {
    log.info('closure-util', 'Listening on http://localhost:' +
        port + '/ (Ctrl+C to stop)');
  });
  server.on('error', function(err) {
    log.error('serve', 'Server failed to start: ' + err.message);
    callback(err);
  });
  callback(null);
}


/**
 * @param {string} configFile Config file path.
 * @param {function(Error)} callback Called when the compilation is
 *     finished or when any error occured.
 */
module.exports = function(configFile, callback) {
  async.waterfall([
    readConfig.bind(null, configFile),
    assertValidConfig,
    createServer,
    listen
  ], function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
};
