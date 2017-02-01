var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var glob = require('glob');
var minimatch = require('minimatch');

var async = require('async');
var lo = require('lodash');

var config = require('./config');


/**
 * Test whether one object is like another.  In the test object, '*' is used
 * as a wildcard.  This is designed to compare AST nodes and does not work with
 * object values that are Date, RegExp, Number, String, or Boolean instances.
 *
 * @param {Object|Array|number|string} obj The candidate object.
 * @param {Object|Array|number|string} test The template used to test.
 * @return {boolean} The object matches the template.
 */
exports.like = function like(obj, test) {
  var is = false;
  if (test === '*') {
    is = obj !== undefined;
  } else if (Array.isArray(test)) {
    if (Array.isArray(obj) && test.length === obj.length) {
      is = test.every(function(t, i) {
        return like(obj[i], t);
      });
    }
  } else {
    // null, undefined, string, number, boolean
    is = Object.is(obj, test);
    if (!is && typeof test === 'object' && typeof obj === 'object') {
      // other object (excluding Date, RegExp, Number, String, Boolean)
      var testKeys = Object.keys(test).sort();
      if (like(Object.keys(obj).sort(), testKeys)) {
        is = testKeys.every(function(key) {
          return like(obj[key], test[key]);
        });
      }
    }
  }
  return is;
};


/**
 * Generate an array of file names given an array of patterns.  Ignores
 * directories.
 * @param {Array.<string>|string} patterns List of glob patterns or a single
 *     pattern.
 * @param {object} options Options to glob.
 * @param {function(Error, Array.<string>)} callback Callback.
 */
exports.globs = function(patterns, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }
  async.map(patterns, function(pattern, cb) {
    glob(pattern, options, cb);
  }, function(err, results) {
    if (err) {
      return callback(err);
    }
    var cwd = options.cwd || process.cwd();
    async.filter(lo.uniq(lo.flatten(results)),
        function(file, include) {
          fs.stat(path.resolve(cwd, file), function(err, stats) {
            include(!err && !stats.isDirectory());
          });
        },
        function(filtered) {
          callback(null, filtered);
        });
  });
};


/**
 * Determine if a string matches one of the provided patterns.  Uses
 * minimatch for determining matches.
 * @param {string} str The string to test.
 * @param {Array.<string>} patterns The patterns.
 * @return {boolean} The string matches one of the patterns.
 */
exports.minimatches = function(str, patterns) {
  return patterns.some(function(pattern) {
    return minimatch(str, pattern);
  });
};


var getDependency = function(alias, url) {
  var base = path.join(__dirname, '..', '.deps', alias);

  var hash = crypto.createHash('sha1');
  hash.update(url, 'utf8');
  return path.join(base, hash.digest('hex'));
};


/**
 * Get the path to a downloaded dependency.
 * @param {string} alias Alias to identify the dependency.
 * @param {string} url URL used to download the resource.
 * @return {string} Path to dependency.
 */
exports.getDependency = getDependency;


/**
 * Get the file system path to the Closure Library.
 * @return {string} Path.
 */
exports.getLibraryPath = function() {
  return getDependency('library', config.get('library_url'));
};


/**
 * Get the file system path to the Closure Compiler.
 * @return {string} Path.
 */
exports.getCompilerPath = function() {
  return getDependency('compiler', config.get('compiler_url'));
};
