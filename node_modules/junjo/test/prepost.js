if (typeof global != 'undefined') require('./load.test').load(global);
if (node) junjo_test();

// test start
function junjo_test() {

  var $j = new Junjo();

  $j(function(filename, data) {
    T.equal(__dirname + '/index.html', filename);
    return data.title;
  })
  .pre(function(filename, data) {
    T.deepEqual(this.sub, null, "sub in pre");
    T.deepEqual(this.callback, null, "callback in pre");
    T.deepEqual(this.callbacks(), null, "callbacks in pre");
    T.deepEqual(this.absorb(), null, "absorb in pre");
    T.deepEqual(this.absorbData(), null, "absorbData in pre");
    T.deepEqual(this.absorbEnd(), null, "absorbEnd in pre");
    return Junjo.multi(__dirname + '/' + filename, data);
  })
  .post(function(title) {
    T.equal(title, 'hello');
    T.deepEqual(this.sub, null, "sub in post");
    T.deepEqual(this.callback, null, "callback in post");
    T.deepEqual(this.callbacks(), null, "callbacks in post");
    T.deepEqual(this.absorb(), null, "absorb in post");
    T.deepEqual(this.absorbData(), null, "absorbData in post");
    T.deepEqual(this.absorbEnd(), null, "absorbEnd in post");
    return title + " world";
  })
  .next(function(title) {
    T.equal(title, 'hello world');
    return "aaaaa";
  })
  .post(function(v) {
    T.equal(v, 'aaaaa');
  })
  .next(function(v) {
    T.equal(v, 'aaaaa');
  });

  $j.run("index.html", { title: "hello"});
}
