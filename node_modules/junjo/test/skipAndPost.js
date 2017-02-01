if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  if (!node) return;
  var $j = new Junjo();

  $j(function() {
    this.skip(this.label, "hoge");
  })
  .out()
  .post(function() {
    T.fail("this must not be called.");
  });

  $j.exec(function(err, out) {
    T.equal(out, 'hoge');
  });
}
