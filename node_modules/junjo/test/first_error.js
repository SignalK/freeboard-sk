if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  function asy(name, n, cb) {
    consolelog(name);
    setTimeout(function() {
      consolelog('\t' + name + ' + ' + n + ' [sec]');
			var err = (name == "2nd") ? new Error(name + ": error...") : null;
      cb(err, name);
    }, n);
  }

  var $j = new Junjo();

  $j('1st', function() {
    asy(this.label, 10, this.callback);
  });

  $j('2nd', function() {
    asy(this.label, 20, this.callback);
  })
  .firstError();

  $j('3rd', function() {
    asy(this.label, 5, this.callback);
  }).after('1st');

  $j('4th', function(v) {
    T.equal(v, '2nd', 'from catcher');
    asy(this.label, 20, this.callback);
  }).after('2nd');

  $j.catchesAbove(function(e, args) {
    consolelog("catch!" + e.message, this.label);
    T.equal(this.label, '2nd');
		return this.label;
  });

  $j.on('end', function() {
    consolelog("END");
  });

  $j.run();
}
