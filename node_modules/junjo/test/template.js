if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var $J = new Junjo.Template();
  var count = 0;

  $J(function() {
    T.equal(this.$.hoge, undefined);
    this.$.hoge = count;
    ++count;
    return count;
  })
  .out();

  var $j = new Junjo();

  $j(function() {
    for (var i=0; i<100; i++) {
      new $J().exec(this.callbacks(i));
    }
  });

  $j.exec(function(err, out) {
    T.equal(count, 100);
  });
}
