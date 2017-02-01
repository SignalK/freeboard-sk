if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();

  $j('1st', function() {
    this.callback;
    throw new Error();
  })
  .failSafe('hoge', {fuga: "piyo"});

  $j('2nd', function(a, b) {
    T.equal(a, "hoge");
    T.equal(b.fuga, "piyo");
    console.log(a, b);
  }).after();

  $j.run();
}
