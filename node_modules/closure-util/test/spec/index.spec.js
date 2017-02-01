var http = require('http');
var path = require('path');

var assert = require('../helper').assert;

var closure = require('../../lib');

var fixtures = path.join(__dirname, '..', 'fixtures');

describe('The API', function() {

  describe('Manager', function() {
    it('provides a manager for parsing and watching scripts', function() {
      var manager = new closure.Manager({closure: false});
      assert.instanceOf(manager, closure.Manager);
    });
  });

  describe('Server', function() {
    it('provides a debug server', function() {
      var server = new closure.Server({
        manager: null
      });
      assert.instanceOf(server, closure.Server);
      assert.instanceOf(server, http.Server);
    });
  });

  describe('compile()', function() {
    it('drives the compiler', function() {
      assert.equal(typeof closure.compile, 'function');
    });
  });

  describe('getDependencies()', function() {
    it('generates a list of scripts in dependency order', function(done) {
      var config = {
        closure: false,
        cwd: fixtures,
        lib: 'dependencies/**/*.js'
      };
      closure.getDependencies(config, function(err, paths) {
        var names = paths.map(function(s) {
          return path.basename(s);
        });
        assert.deepEqual(names,
            ['base.js', 'food.js', 'fruit.js', 'banana.js']);
        done();
      });
    });
  });

});
