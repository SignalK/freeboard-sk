if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo({run : true});

  $j(function() {
    throw new Error('msg');
  })
  .fail(function(e, args) {
    T.equal(e.message, 'msg', 'e in catcher');
    T.equal(args[0], true, 'args in catcher');
    T.strictEqual(this.$, this.shared, '$ in catcher');
    T.deepEqual(this.sub, null, "sub in catcher");
    T.deepEqual(this.callback, null, "callback in catcher");
    T.deepEqual(this.callbacks(), null, "callbacks in catcher");
    T.deepEqual(this.absorb(), null, "absorb in catcher");
    T.deepEqual(this.absorbData(), null, "absorbData in catcher");
    T.deepEqual(this.absorbEnd(), null, "absorbEnd in catcher");
  });
}
