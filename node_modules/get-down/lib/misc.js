var fs = require('fs');
var path = require('path');

var Q = require('q');


/**
 * Copy a file, returning a promise.  Will not overwrite an existing file.
 * @param {string} src Path to the source file.
 * @param {string} dest Path to the dest file.
 * @return {Promise} A promise that resolves to the destination path on success
 *     and is rejected on failure.
 */
exports.copy = function(src, dest) {
  var deferred = Q.defer();

  var read = fs.createReadStream(src);
  read.on('error', deferred.reject);

  var write = fs.createWriteStream(dest, {flags: 'wx'});
  write.on('error', function(err) {
    // rejecting immediately was causing trouble on Node v0.8
    // see https://github.com/tschaub/get-down/issues/1
    process.nextTick(function() {
      deferred.reject(err);
    });
  });
  write.on('close', deferred.resolve.bind(deferred, dest));

  read.pipe(write);
  return deferred.promise;
};


/**
 * Promise that the provided path points to an existing directory.
 * @param {string} dir Path to directory.
 * @return {Promise} A promise that resolves to the path if a directory exists
 *     and is rejected if not.
 */
exports.existingDirectory = function(dir) {
  var deferred = Q.defer();
  fs.stat(dir, function(err, stats) {
    if (err || !stats.isDirectory()) {
      deferred.reject(new Error('Not a directory: ' + dir));
    } else {
      deferred.resolve(dir);
    }
  });
  return deferred.promise;
};


/**
 * Generate a promise for a file path.
 * @param {string} dirOrFile Path to a candidate file or directory.
 * @param {string} basename Filename to use if dirOrFile is a directory.
 * @return {Promise} A promise that resolves to the file path if one could be
 *     determined and is rejected otherwise.
 */
exports.resolveFilePath = function(dirOrFile, basename) {
  var deferred = Q.defer();
  fs.stat(dirOrFile, function(err, stats) {
    if (err) {
      if (err.code !== 'ENOENT') {
        // some unexpected error
        deferred.reject(err);
      } else {
        // directory doesn't exist, check parent
        fs.stat(path.dirname(dirOrFile), function(err2, stats) {
          if (err2 || !stats.isDirectory()) {
            deferred.reject(err);
          } else {
            deferred.resolve(dirOrFile);
          }
        });
      }
    } else if (!stats.isDirectory()) {
      deferred.reject(new Error('Not a directory: ' + dirOrFile));
    } else {
      deferred.resolve(path.join(dirOrFile, basename));
    }
  });
  return deferred.promise;
};
