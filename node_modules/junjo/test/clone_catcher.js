if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();

  $j.catcher(function(e) {
    T.ok("original catcher");
  });

  $j(function() {
    throw new Error();
  });

  var $j2 = $j.clone();
  $j2.run();
}
