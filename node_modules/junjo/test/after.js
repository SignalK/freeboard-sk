if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({after: true});

  $j('1st', function() {
    asyncMethod(this.label, 50, this.callback);
    this.shared.hoge = "HogeHoge";
  });

  $j('2nd', function() {
    T.equal(this.$.hoge, 'HogeHoge', 'shared value');
    T.equal(this.results('1st')[1], '1st');
    asyncMethod(this.label, 10, this.callback);
  });

  $j('3rd', function() {
    T.equal(this.results('2nd')[1], '2nd');
    asyncMethod(this.label, 20, this.callback);
  });

  $j('4th', function() {
    T.equal(this.results('3rd')[1], '3rd');
    asyncMethod(this.label, 10, this.callback);
  });

  $j('5th', function() {
    T.equal(this.results('4th')[1], '4th');
    asyncMethod(this.label, 10, this.callback);
  }).after();

  $j('6th', function() {
    T.equal(this.results('5th')[1], '5th');
    asyncMethod(this.label, 10, this.callback);
  }).after();

  $j('7th', function() {
    T.equal(this.results('6th')[1], '6th');
    T.equal(arguments.length, 6, "arg length in " + this.label);
    asyncMethod(this.label, 10, this.callback);
  }).after('2nd', '3rd');

  $j.on("end", function(err, out) {
  });

  $j.run();
}
