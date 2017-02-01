if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({ timeout: 0.3, run: true});
  $j.noTimeout(true);

  $j(function() {
    asyncMethod(true, 300, this.cb);
  })
  .eshift()
  .fail(function(e) {
    T.fail(e);
    return false;
  })
  .post(function(v) {
    T.ok(v);
  });
}
