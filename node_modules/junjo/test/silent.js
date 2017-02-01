if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo().silent(true);

  $j('1st', function() {
    throw new Error(this.label);
  });

  $j('2nd', function() {
    T.fail("");
  });

  $j.on('end', function(err, out) {
    T.equal(err.message, '1st');
  });

  $j.run();
}
