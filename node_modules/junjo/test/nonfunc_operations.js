if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var $j = new Junjo();


  $j('A', "valA");

  $j('B', {hoge: "fuga"});

  $j('C', function(a, b) {
    T.equal(a, "valA");
    T.equal(b.hoge, "fuga");
  })
  .using("A", "B");

  $j.on('end', function(err, out) {
  });

  $j.run();
}
