if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var hoge = 1;

  var $j = new Junjo({run: true});

  $j(function() {
    setTimeout(this.callback, 100);
    hoge++;
    T.equal(hoge, 2);
  })
  .next(function() {
    console.log("timeout end");
    hoge++;
    T.equal(hoge, 3);
  })
  .next(function() {
    console.log("syncnext");
    hoge++;
    T.equal(hoge, 4);
  })
  .next(function() {
    console.log("syncnext");
    hoge++;
    T.equal(hoge, 5);
  })
}
