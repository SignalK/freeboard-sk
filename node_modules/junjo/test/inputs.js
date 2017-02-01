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

  $j.inputs('A', 0);
  $j.inputs('BC', 1, 2);
  $j.inputs('AC', 0, 2);

  $j.inputs({
    AB : [0,1],
  });

  $j.inputs(["a", "b", "c"]);

  $j.inputs({
    ABC: [0,1,2],
    B  : 1,
    C  : [2]
  });

  $j(function() {
    T.equal(arguments.length, 3, 'arguments.length');
    T.equal(arguments[0], 'a');
    T.equal(arguments[1], 'b');
    T.equal(arguments[2], 'c');
  }).after('A', 'BC');

  $j.on('end', function(err, out) {
    T.equal(out.A.length , 1, 'length of out.A');
    T.equal(out.B.length , 1, 'length of out.B');
    T.equal(out.C.length , 1, 'length of out.C');
    T.equal(out.A[0], 'a', 'value of out.A[0]');
    T.equal(out.B[0], 'b', 'value of out.B[0]');
    T.equal(out.C[0], 'c', 'value of out.C[0]');

    T.equal(out.a[0], "a", 'value of out.a');
    T.equal(out.b[0], "b", 'value of out.b');
    T.equal(out.c[0], "c", 'value of out.c');

    T.equal(out.AB.length , 2, 'length of out.AB');
    T.equal(out.AC.length , 2, 'length of out.AC');
    T.equal(out.BC.length , 2, 'length of out.BC');
    T.equal(out.AB[0], 'a', 'value of out.AB[0]');
    T.equal(out.AC[0], 'a', 'value of out.AC[0]');
    T.equal(out.BC[0], 'b', 'value of out.BC[0]');
    T.equal(out.AB[1], 'b', 'value of out.AB[1]');
    T.equal(out.AC[1], 'c', 'value of out.AC[1]');
    T.equal(out.BC[1], 'c', 'value of out.BC[1]');

    T.equal(out.ABC.length , 3, 'length of out.ABC');
    T.equal(out.ABC[0], 'a', 'value of out.ABC[0]');
    T.equal(out.ABC[1], 'b', 'value of out.ABC[1]');
    T.equal(out.ABC[2], 'c', 'value of out.ABC[2]');
  });

  $j.run('a', 'b', 'c');
}
