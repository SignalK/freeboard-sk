if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({silent: true});
  $j(function() {
    this.out = "A";
    throw new Error("ERROR");
  })
  .fail(function(e) {
    this.err = e;
  });

  $j(function() {
    return Junjo.multi(null, "hoge");
  })
  .errout();

  $j.on('end', function(err, out) {
    T.equal(err.message, "ERROR");
    T.equal(out, "hoge");
  });

  $j.run();
}
