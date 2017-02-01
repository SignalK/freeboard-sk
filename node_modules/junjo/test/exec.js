if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();

  $j.inputs({
    a: 0,
    b: 1
  });

  $j(function(a, b) {
    T.equal(arguments.length, 2);
    T.equal(a, 'a');
    T.equal(b, 'b');
  })
  .after('a', 'b')
  .next(function() {
    asyncMethod("async", 10, this.cb);
  });


  $j.exec("a", "b", function(err, out) {
    out.hoge = "fuga";
  });

  $j.on('end', function(err, out) {
    T.equal(out.hoge, "fuga");
  });
}
