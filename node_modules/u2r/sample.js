var u2r = require("./u2r");

var op = u2r("nodejs.org");

var http = require(op.protocol == 'https' ? 'https' : 'http');

var req = http.request(op, function(res) {
  res.on('data', function(d) {
    process.stdout.write(d);
  });
});
req.end();
