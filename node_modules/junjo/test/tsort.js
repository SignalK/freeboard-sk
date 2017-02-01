if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();
  $j('A', function() {}).after('B');
  $j('B', function() {}).after('A');
  try {
    $j.run();
    T.fail();
  }
  catch (e) {
    T.ok(true, e.message);
  }

  $j = new Junjo();
  $j('A', function() {}).after('B');
  $j('B', function() {}).after('C');
  $j('C', function() {}).after('A');
  try {
    $j.run();
    T.fail();
  }
  catch (e) {
    T.ok(true, e.message);
  }

  $j = new Junjo();
  $j('A', function() {});
  $j('B', function() {}).after('A');
  $j('C', function() {}).after('B');
  try {
    $j.run();
    T.ok(true, 'no circle');
  }
  catch (e) {
    T.fail(e.message);
  }

}
