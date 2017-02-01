if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();
  var lbl = function() { console.log(this.label) };

  $j('A', lbl);
  $j('B', lbl);
  $j('C', lbl);
  $j.remove('B');
  $j.on('end', function(err, out) {
    T.equal(err, null);
    T.equal(Object.keys(out).length, 2);
  });
  $j.run();
}
