var node = (typeof exports == 'object' && exports === this);
if (node) { require('termcolor').define() }

var assert = (node) ? require('assert') : {};
var T = { count : 0, success : 0 };
T.__proto__.total = function() { return this.success + '/' + this.count };

[ 'equal', 'ok', 'fail', 'notEqual', 'deepEqual', 'notDeepEqual', 'strictEqual', 'notStrictEqual']
.forEach(function(fname) {
  T.__proto__[fname] = (function(n) {
    return function() {
      this.count++;
      try {
        // var name = Array.prototype.pop.call(arguments);
        var name = arguments[arguments.length -1];
        assert[n].apply(assert, arguments);
        this.success++;
        console.green('[OK]', this.total(),  n, name);
        return true;
      }
      catch (e) {
        console.ered('[NG]', this.total(), n, name);
        console.eblue(e.stack);
        return false;
      }
    }
  })(fname);
});

function asyncMethod(name, n, cb, e) {
  consolelog(name);
  setTimeout(function() {
    consolelog('\t' + name + ' + ' + n + ' [msec]');
    cb(e || null, name);
  }, n);
}

function syncMethod(name) {
  consolelog(name);
  consolelog('\t' + name + ' (sync)');
  return name + ' (sync)';
}

function consolelog() {
  if (node) {
    console.log.apply(this, arguments);
  }
  else {
    Array.prototype.forEach.call(arguments, function(v) {
      console.log(v);
      var el = document.createElement('li');
      el.innerHTML = v.toString();
      document.getElementById('test').appendChild(el);
    });
  }
}

if (node) {
  module.exports = {
    load: function(that) {
      that.asyncMethod = asyncMethod;
      that.node = true;
      that.syncMethod = syncMethod;
      that.consolelog = consolelog;
      that.Junjo = require('junjo');
      that.T = T;
    }
  };
}
else {
  var require = function() { return {load: function() {}}};
}

