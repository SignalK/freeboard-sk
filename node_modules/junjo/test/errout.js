if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();
  $j(function() {
    return "hoge";
  })
  .out();

  $j.on('end', function(err, out) {
    T.equal(out, "hoge");
  });

  var $j2 = new Junjo();

  $j2($j)
  .errout();

  $j2(function() {
    return "ERR"
  })
  .after()
  .err(0);

  $j2.on('end', function(err, out) {
    T.equal(err, "ERR");
    T.equal(out, "hoge");
  });

  $j2.run();
}
