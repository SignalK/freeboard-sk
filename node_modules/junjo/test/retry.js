if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var counter = 0;

  var $j = new Junjo({run: 1});

  $j('1st', function() {
    var n = Math.random();
    console[n < 0.95 ? 'purple' : 'cyan'](n);
    if (n < 0.95) throw new Error("smalllllllll!");
    return n;
  })
  .retry(function(e, args, count) {
    T.deepEqual(this.sub, null, "sub in retry");
    T.deepEqual(this.callback, null, "callback in retry");
    T.deepEqual(this.callbacks(), null, "callbacks in retry");
    T.deepEqual(this.absorb(), null, "absorb in retry");
    T.deepEqual(this.absorbData(), null, "absorbData in retry");
    T.deepEqual(this.absorbEnd(), null, "absorbEnd in retry");
    T.equal(count, ++counter, "count");
    return true;
  })
  .next(function(n) {
    T.ok(n > 0.95, ">0.95");
  })
}
