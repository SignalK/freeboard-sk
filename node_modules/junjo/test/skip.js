if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var $j = new Junjo();

  var report = function() {
    console.log(this.label);
    if (!Array.isArray(this.out)) this.out = [];
    this.out.push(this.label);
  };

  var skip = function() {
    this.skip(this.label, 'skipped');
  };

  $j('L1', report);
  $j('L2', skip).after();
  $j('L3', report);
  $j('L4', skip).after('L1', 'L7');
  $j('L5', report).after();
  $j('L6', report).after('L3');
  $j('L7', skip).after();
  $j('L8', report).after('L5');

  $j.on('end', function(err, out) {
    T.equal(out.length, 5, "length of out");
    console.log(out)
  });
  $j.run();
}
