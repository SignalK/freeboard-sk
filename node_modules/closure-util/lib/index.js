var log = require('npmlog');

var Manager = require('./manager').Manager;
var Server = require('./server').Server;
var compile = require('./compile');
var util = require('./util');


/**
 * Script manager.
 * @type {Manager}
 */
exports.Manager = Manager;


/**
 * Library server.
 * @type {Server}
 */
exports.Server = Server;


/**
 * Compile function.
 * @type {function(Object, function(Error, string))}
 */
exports.compile = compile;


/**
 * Log.
 * @type {Object}
 */
exports.log = log;


/**
 * Get a list of script paths sorted in dependency order.
 * @param {Object} options Options.
 * @param {function(Error, Array.<string>)} callback Callback.
 */
exports.getDependencies = function(options, callback) {
  var manager = new Manager(options);
  manager.on('error', callback);
  manager.on('beforewatch', function() {
    manager.close();
    var paths;
    try {
      paths = manager.getDependencies(options.main).map(function(script) {
        return script.path;
      });
    } catch (err) {
      return callback(err);
    }
    callback(null, paths);
  });
};


/**
 * Get the file system path to the Closure Library.
 * @return {string} Path.
 */
exports.getLibraryPath = util.getLibraryPath;


/**
 * Get the file system path to the Closure Compiler.
 * @return {string} Path.
 */
exports.getCompilerPath = util.getCompilerPath;
