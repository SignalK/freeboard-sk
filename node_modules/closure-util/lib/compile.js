var cp = require('child_process');
var path = require('path');
var fs = require('fs');
var temp = require('temp');

var log = require('npmlog');

var util = require('./util');


/**
 * Compile scripts.
 * @param {Object} options An object with optional `compile`, `cwd`, and `jvm`
 *     properties.
 * @param {function(Error, string)} callback Callback called with any
 *     compilation error or the result.
 */
exports = module.exports = function(options, callback) {
  options = options || {};
  if (!options.jvm) {
    options.jvm = ['-server', '-XX:+TieredCompilation'];
  }
  var compilerDir = util.getCompilerPath();
  var args = options.jvm.concat('-jar', path.join(compilerDir, 'compiler.jar'));

  var flagFile;

  // add all compile options
  if (options.compile) {
    var flags = [];
    Object.keys(options.compile).forEach(function(key) {
      var value = options.compile[key];
      if (typeof value === 'boolean') {
        if (value) {
          flags.push('--' + key);
        }
      } else {
        var values = Array.isArray(value) ? value : [value];
        for (var i = 0, ii = values.length; i < ii; ++i) {
          flags.push('--' + key, '"' + values[i].replace(/"/g, '\\"') + '"');
        }
      }
    });
    flagFile = temp.path({prefix: 'compile-flags-', suffix: '.txt'});
    fs.writeFileSync(flagFile, flags.join(' '));
    args.push('--flagfile=' + flagFile);
  }

  log.silly('compile', 'java ' + args.join(' '));
  var child = cp.spawn('java', args, {cwd: options.cwd || process.cwd()});

  var out = [];
  child.stdout.on('data', function(chunk) {
    out.push(chunk.toString());
  });

  child.stderr.on('data', function(chunk) {
    log.error('compile', chunk.toString());
  });

  child.on('close', function(code) {
    var err = null;
    if (code !== 0) {
      err = new Error('Process exited with non-zero status, ' +
          'see log for more detail: ' + code);
    }
    if (flagFile) {
      fs.unlinkSync(flagFile);
    }
    callback(err, out.join(''));
  });
};
