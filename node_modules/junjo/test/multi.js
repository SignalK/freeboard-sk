if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({after: true});

  $j('1st', function() {
    console.log(this.label);
    return Junjo.multi(1,22,333,4444);
  });

  $j('2nd', function() {
    T.equal(arguments.length, 4, "argument length in " + this.label);
    throw "";
  })
  .fail(function() {
    return Junjo.multi(55,66,777);
  })
  .next('3rd', function() {
    T.equal(arguments.length, 3, "argument length in " + this.label);
  })
  .next('4th', function() {
    this.skip('4th2', 88,999);
  })
  .next('4th2', function() {
    T.fail(this.label + " must not be called.");
  })
  .next('5th', function() {
    T.equal(arguments.length, 2, "argument length in " + this.label);
    return Junjo.multi(1,2,3,4);
  })
  .firstError(true)
  .fail(function(e, args) {
    T.ok(true, this.label + " must fail.");
    return Junjo.multi(5,6,7,8);
  })
  .next('6th', function() {
    T.equal(arguments.length, 4, "argument length in " + this.label);
  })

  $j.run();
}
