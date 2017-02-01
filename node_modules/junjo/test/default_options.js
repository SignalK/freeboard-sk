if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  Junjo.defaultOptions.timeout = 0.001;
  var $j = new Junjo();

  $j(function() {
    asyncMethod(this.label, 30, this.callback);
  })
  .fail(function(e) {
    T.ok(e.message.match("0.001"));
  });

  $j.run();
}
