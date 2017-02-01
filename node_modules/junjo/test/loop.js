if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var counter1 = 0; counter2 = 0;

  var $j = new Junjo({run: Junjo.multi("hoge", "fuga"), clear: false, destroy: false});

  $j('1st', function() {
    counter1++;
    console.green(arguments);
    asyncMethod(this.label, 20, this.callback);
  })
  .loop(5)
  .next(function() {
    console.yellow(arguments);
    return 1;
  })
  .next('2nd', function(n, result,count) {
    counter2++;
    console.cyan(arguments);
    asyncMethod(this.label, 10, this.callback);
  })
  .loop(function(result, args, count) {
    console.log(result);
    T.deepEqual(this.sub, null, "sub in loop");
    T.deepEqual(this.callback, null, "callback in loop");
    T.deepEqual(this.callbacks(), null, "callbacks in loop");
    T.deepEqual(this.absorb(), null, "absorb in loop");
    T.deepEqual(this.absorbData(), null, "absorbData in loop");
    T.deepEqual(this.absorbEnd(), null, "absorbEnd in loop");
    return count < 10;
  }, 33);

  $j.on('end', function() {
    T.equal(counter1, 5);
    T.equal(counter2, 10);
  });
}
