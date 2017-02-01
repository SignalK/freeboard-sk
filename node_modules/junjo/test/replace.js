if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var $j = new Junjo();


  $j('A', function() {
    T.ok(true, 'A must be executed');
    console.yellow(this.label);
  });

  $j('B', function() {
    console.yellow(this.label);
  });

  $j('C', function() {
    console.yellow(this.label);
  }).after('A');

  $j('D', function() {
    console.yellow(this.label);
  }).after('A');

  $j('E', function() {
    T.fail('E must not be executed');
    console.yellow(this.label);
  }).after('A','B');

  $j('F', function() {
    console.yellow(this.label);
  }).after('C');

  $j('G', function() {
    console.yellow(this.label);
  }).after('D', 'E');

  $j('H', function() {
    console.yellow(this.label);
  }).after('C','G');

  $j.replace('E', 'replace');

  try {
    $j('I', function() {});
    T.fail(e.message);
  }
  catch (e) {
    T.ok(true, e.message);
  }

  $j.on('end', function(err, out) {
    T.equal(out.E, 'replace');
  });

  $j.run();
}
