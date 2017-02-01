if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  if (!node) return;
  var spawn = require('child_process').spawn;

  var $j = new Junjo();

  $j('1st', function() {
    T.equal(arguments.length, 0, "no args");
    var grep = spawn('grep', ['consolelog', "unkO"]);
    this.absorbData(grep.stdout, '1stdata');
    this.absorbData(grep.stderr, '1sterr');
  })
  .reduce(function(result, args, key) {
    var err = Array.prototype.shift.call(args);
    result[0] = result[0] || err;
    result[1] || (result[1] = {});
    result[1][key] = args[0];
    result.length = 2;
    return result;
  }, Junjo.multi())
  .firstError();

  $j('2nd',function() {
    console.log(arguments);
    T.strictEqual(arguments.length, 2, "argument length");
    var grep = spawn('grep', ['console', __filename]);
    this.absorbData(grep.stdout, '1stdata');
    this.absorbData(grep.stderr, '1sterr');
  }).after('1st');

  $j(function(err, out) {
    console.log("grepResult", out);
    T.equal(err, null, "no err");
    T.ok(out, "out");
  }).after('2nd');

  var $j2 = new Junjo();

  $j2("req", function() {
    var count = Array.prototype.pop.call(arguments);
    var http = require('http');
    var req = http.request({
      method: 'GET',
      host: 'localhost',
      port: 79 + count,
      path: '/'
    }, this.cb);
    req.on("error", this.fail);
    req.end();
  })
  .fail(function(e) {
    console.purple("request Error", e.message);
    this.terminate();
  })
  .loop(2)
  .next(function(res) {
    console.log(res)
    this.sub(function() { this.out = 'Yeah!' });
    var grep = spawn('grep', ['consolelog', __filename]);
    this.absorbData(grep.stdout, '1stdata');
    this.absorbData(grep.stderr, '1sterr');
    this.absorbData(res, 'response');
  })
  .reduce(function(result, args, key) {
    var err = Array.prototype.shift.call(args);
    result[0] = result[0] || err;
    result[1] || (result[1] = {});
    result[1][key] = args[0];
    result.length = 2;
    return result;
  }, Junjo.multi())

  .next(function(err, out) {
    console.log(err, out);
    T.strictEqual(err, undefined, "no err");
    T.strictEqual(typeof out, 'object', "typeof out");
    T.strictEqual(typeof out["1stdata"], 'string', "typeof out.1stdata");
    T.strictEqual(out["sub"], 'Yeah!', "out.sub");
  });

  $j.next($j2);
  $j.run();
}
