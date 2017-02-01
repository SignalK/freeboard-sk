var Junjo = require('junjo');
var $j    = new Junjo();
var fs    = require('fs');
var exec  = require('child_process').exec;
var cl    = require('termcolor').define();
var ignores = [
  'load.test.js',
  'all.js',
  'memuse.js'];

// 1. get test files
$j('files', function() {
  fs.readdir(__dirname, this.cb);
})
.firstError('shift')
.post(function(files) {
  // filter unnecessary files
  return files.filter(function(v) {
    return v.slice(-3) == '.js' && ignores.indexOf(v) < 0;
  });
});


$j('exec', function(files) {
  files.forEach(function(file, k) {
    exec([process.argv[0], __dirname + '/' + file].join(' '), this.callbacks(file));
  }, this);
})
.after()
.reduce(function(result, args, filename) {
  console.log('------------------------------------[' + filename + ']------------------------------------'); 
  if (args[0]) console.ered(args[0]); 
  console.log(args[1]); 
  console.yellow(args[2]);
  if (args[0] || args[2]) result.push(filename);
  return result;
}, [])
.timeout(0)
.out(0);

$j.on('end', function(err, out) {
  if (out.length) {
    console.red('ERRORS IN ', out.join(', '));
  }
  else {
    console.green('ALL PASSED');
  }
});
$j.run();
