if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({run : true});

  // ARRAY
  $j("array", function() {
    var ret = [];
    for (var i=0; i<1000; i++) {
      ret.push(Math.random());
    }
    return ret;
  });

  $j('iterateArr', function(arr) {
    this.forEach(arr, function(v, k) {
      async(v, this.callbacks());
    });
  })
  .reduce(function(result, v, k) {
    if (k == 0) {
      T.equal(v.length, 0);
      return result;
    }
    return result + k;
  }, 0)
  .after("array");

  $j('afterIterate', function(v) {
    T.equal(v, 500500);
  })
  .after("iterateArr");


  // OBJECT
  $j("obj", function() {
    var obj = {};
    for (var i=0; i<1000; i++) {
      obj["obj" + i] = i;
    }
    return obj;
  });


  $j('iterateObj', function(obj) {
    this.forEach(obj, function(v, k) {
      async(v, this.callbacks());
    });
  })
  .reduce(function(result, args, k) {
    if (k == 0) {
      T.equal(args.length, 0);
      return result;
    }
    return result + args[0];
  }, 0)
  .after("obj");

  $j('afterIterateObj', function(v) {
    T.equal(v, 500500 - 1000);
  })
  .after("iterateObj");
}

function async(v, cb) {
  setTimeout(function() {
    cb(v);
  }, 5);
}
