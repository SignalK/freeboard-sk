if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {
  var $j = new Junjo({timeout: 1});

  $j('1st', function() {
    syncMethod(this.label);
    this.sub('2nd', function() {
      T.equal(this.junjo.options.timeout, 1, "timeout");
      console.log(this.junjo.options.timeout)
      asyncMethod(this.label, 20, this.cb);
      this.out[this.label] = "hoge";
    });

    this.sub('3rd', function() {
      asyncMethod(this.label, 20, this.cb);
      this.out[this.label] = "fuga";
    }).after();
  });

  $j('4th', function(err, out) {
    console.log(err, this.label, out);
    T.deepEqual(err, null, "err");
    T.deepEqual(out, { '2nd': 'hoge', '3rd': 'fuga'}, "out");
  }).after('1st');



  var $j2 = new Junjo();

  $j2('BB', function() {
    console.log(arguments);
    T.equal(arguments[0], '000');
    T.equal(arguments.length, 3, "arguments length");
    syncMethod(this.label);
    this.out[this.label] = "piyo";
  });

  $j('AA', function() {
    syncMethod(this.label);
    this.sub = $j2;
  }).next(function(err, out) {
    console.log(out);
    T.deepEqual(out, { BB : 'piyo'});
  });

  var $j3 = new Junjo();
  $j3(function() {
    this.sub(function() {
      this.out = "sub";
    });
  })
  .next(function(err, out) {
    this.out = out + "sub";
  });

  $j($j3)
  .next(function(err, out) {
    console.log("subsub? -->", out);
    T.deepEqual(out, 'subsub');
  });

  $j.run('000', 111, 2222);
}

