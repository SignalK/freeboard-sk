if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();

  $j(function() {
    asyncMethod(this.label, 10, this.callback, "ERR");
  })
  .eshift()
  .fail(function(e) {
    console.log(e.stack)
    T.equal(e, "ERR");
  });

  $j.run();
}
