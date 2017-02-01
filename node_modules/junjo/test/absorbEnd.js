if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  if (!node) return;
  var spawn = require('child_process').spawn;

  var $j = new Junjo();

  $j(function() {
    var grep = spawn('grep', ['junjo', __filename]);
    this.absorb(grep.stdout, 'data', function(data) {
      $j.emit('data', data.toString());
    });
  });

  $j2 = new Junjo();

  $j2(function() {
    this.absorb($j, 'data', function(data, result) {
     if (!result) return [data]; 
     result.push(data);
    });
    $j.run();
  })
  .post(function(err, out) {
    T.ok(Array.isArray(out), 'out is array');
  });

  $j2.run();
}
