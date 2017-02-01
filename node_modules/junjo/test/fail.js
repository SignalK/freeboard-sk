if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var $j = new Junjo();
  var u2r = require('u2r');
  var http = require('http');

  $j('request', function(url) {
    var options = u2r(url);
    console.log(options)
    var req = http.request(options, this.cb);
    req.on("error", this.fail);
    req.end();
  })
  .fail(function(e) {
    console.log(e.message)
    this.terminate();
  });

  $j('response', function(res) {
    this.absorbData(res);
  })
  .firstError('shift')
  .after();

  $j.exec("localhost", function(err, out) {
    T.equal(out.request.length, 0, 'result of response');
    T.equal(out.response.length, 0, 'result of response');
  });
}
