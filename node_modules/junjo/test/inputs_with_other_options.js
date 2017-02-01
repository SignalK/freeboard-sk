if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({run: Junjo.multi("a", "b"), firstError: true});

  $j.inputs(["a", "b"]);

  $j('1st', function(a) {
    console.green(a);
    T.equal(a, "a");
  })
  .using("a");
}
