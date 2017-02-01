if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({run : true});

  $j(function() {
    var count = 1;
    this.callbacks()("async" + count++);
    this.callbacks()("async" + count++);
    this.callbacks()("async" + count++);
    return "sync";
  })
  .reduce(function(result, args, k) {
    return result + args[0];
  }, "")
  .out();

  $j.on("end", function(err, out) {
    T.equal(out, "async1async2async3");
  });
}
