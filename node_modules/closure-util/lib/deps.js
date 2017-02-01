var fs = require('fs');

var download = require('get-down');
var log = require('npmlog');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var util = require('./util');
var config = require('./config');

/**
 * Download a dependency if not already present.
 * @param {string} alias Alias for the dependency.
 * @param {string} url URL for the dependency.
 * @param {function(Error, string)} callback Called with any error and the
 *     installation directory.
 */
function maybeDownload(alias, url, callback) {
  var dir = util.getDependency(alias, url);

  fs.exists(dir, function(exists) {
    if (exists) {
      log.verbose('install', 'Skipping ' + url);
      log.verbose('install', 'To force download delete ' + dir);
      callback(null, dir);
    } else {
      mkdirp(dir, function(err) {
        if (err) {
          return callback(err);
        }
        log.info('install', 'Downloading ' + url);
        var dl = download(url, {dest: dir, extract: true});

        dl.on('progress', function(state) {
          if (state.retry) {
            var delay = Math.round(state.delay / 1000) + 's';
            log.info('install', 'Download failed, retrying again in ' + delay);
          } else {
            var progress = Math.floor(state.received / 1024) + 'K';
            if (state.percent) {
              progress = state.percent + '% (' + progress + ')';
            }
            log.info('install', 'Received ' + progress);
          }
        });

        dl.once('end', function(dest) {
          log.info('install', 'Download complete: ' + dest);
          callback(null, dest);
        });

        dl.on('error', function(err) {
          rimraf(dir, function(rimrafErr) {
            if (rimrafErr) {
              log.error('install', rimrafErr);
            }
            callback(err);
          });
        });
      });
    }
  });

}

/**
 * Update the compiler based on the configured compiler_url.
 * @param {function(Error, string)} callback Callback called with any error and
 *     the installation directory.
 */
exports.updateCompiler = function(callback) {
  var compilerUrl = config.get('compiler_url');
  if (typeof compilerUrl !== 'string') {
    callback(new Error('No compiler_url configured'));
    return;
  }
  maybeDownload('compiler', compilerUrl, callback);
};

/**
 * Update the library based on the configured library_url.
 * @param {function(Error, string)} callback Callback called with any error and
 *     the installation directory.
 */
exports.updateLibrary = function(callback) {
  var libraryUrl = config.get('library_url');
  if (typeof libraryUrl !== 'string') {
    callback(new Error('No library_url configured'));
    return;
  }
  maybeDownload('library', libraryUrl, callback);
};
