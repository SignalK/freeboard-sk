if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

function asy(color, name, n, cb, e) {
  console.color(color, name);
  setTimeout(function() {
    console.color(color, '\t' + name + ' + ' + n + ' [sec]');
    cb(e || null, name);
  }, n);
}

// test start
function junjo_test() {

  var $j = new Junjo();
  $j.noTimeout(true);

  var $k = new Junjo({timeout: 0.03});

  $k(function() {
    setTimeout(this.cb, 40);
  })
  .fail(function(e) {
    T.fail(e, "notimeout");
  });

  $j($k);

  $j.run();
}
