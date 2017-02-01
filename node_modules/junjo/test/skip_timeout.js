if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();
  $j(function() {
    this.cb;
    this.terminate();
  })
  .timeout(100);

  $j.run();
}
