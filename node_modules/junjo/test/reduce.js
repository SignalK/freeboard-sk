if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({ run : true });
  $j(function() {
    asyncMethod("A", 90, this.callbacks());
    asyncMethod("B", 30, this.callbacks());
  })
  .reduce(function(result, args, key) {
    var err = Array.prototype.shift.call(args);
    result[0] = result[0] || err;
    result[key + 1] = args[0];
    result.length = Object.keys(result).length;
    return result;
  }, Junjo.multi())
  .post(function() {
    T.equal(arguments.length, 3);
    T.equal(arguments[0], null);
    T.equal(arguments[1], 'A');
    T.equal(arguments[2], 'B');
  });
}
