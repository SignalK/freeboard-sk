if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  if (!node) return;

  var $j = new Junjo({result: true});

  var A = "A".charCodeAt(0);
  for (var i=A, l = A+3; i<l; i++) {
    (function(i) {
      $j(function() { return String.fromCharCode(i) }).after();
    })(i);
  }

  $j(function() {
    return Array.prototype.join.call(arguments, '');
  })
  .out()
  .afterAbove();

  T.equal($j.run(), "ABC");
}
