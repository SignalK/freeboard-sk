var path = require('path');

var Manager = require('../../lib/manager').Manager;
var helper = require('../helper');

var assert = helper.assert;
var fixtures = path.join(__dirname, '..', 'fixtures');

describe('manager', function() {

  describe('Manager', function() {

    describe('constructor', function() {
      it('creates a Manager instance', function() {
        var manager = new Manager({closure: false});

        assert.instanceOf(manager, Manager);
      });
    });

    describe('"ready" event', function() {
      it('is fired after scripts are parsed', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies/**/*.js'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          done();
        });
      });
    });

    describe('"error" event', function() {
      it('is fired on initial parsing error', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'errors/**/*.js'
        });
        manager.on('error', function(err) {
          assert.instanceOf(err, SyntaxError);
          done();
        });
        manager.on('ready', function() {
          done(new Error('Expected error event'));
        });
      });
    });

    describe('"beforewatch" event', function() {
      it('is fired before ready event', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies/**/*.js'
        });
        var before = false;
        manager.on('error', done);
        manager.on('beforewatch', function() {
          before = true;
        });
        manager.on('ready', function() {
          assert.isTrue(before);
          done();
        });
      });
    });

    describe('"close" event', function() {
      it('is fired after calling close', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies/**/*.js'
        });
        manager.on('error', done);
        manager.on('beforewatch', function() {
          manager.close();
        });
        manager.on('close', function() {
          done();
        });
      });
    });

    describe('#getDependencies()', function() {

      it('sorts lib scripts', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies/**/*.js'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies();
          var paths = dependencies.map(function(s) {
            return path.basename(s.path);
          });
          assert.deepEqual(paths,
              ['base.js', 'food.js', 'fruit.js', 'banana.js']);
          done();
        });
      });

      it('provides dependencies for a main script (car)', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies-main/+(lib|goog)/**/*.js',
          main: 'dependencies-main/main-*.js'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies(
              path.join(fixtures, 'dependencies-main', 'main-car.js'));
          var paths = dependencies.map(function(s) {
            return path.basename(s.path);
          });
          assert.deepEqual(paths,
              ['base.js', 'fuel.js', 'vehicle.js', 'car.js', 'main-car.js']);
          done();
        });
      });

      it('provides dependencies for a main script (boat)', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies-main/+(lib|goog)/**/*.js',
          main: 'dependencies-main/main-*.js'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies(
              path.join(fixtures, 'dependencies-main', 'main-boat.js'));
          var paths = dependencies.map(function(s) {
            return path.basename(s.path);
          });
          assert.deepEqual(paths,
              ['base.js', 'fuel.js', 'vehicle.js', 'boat.js', 'main-boat.js']);
          done();
        });
      });

      it('does not provide main scripts if not requested', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies-main/+(lib|goog)/**/*.js',
          main: 'dependencies-main/main-*.js'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies();
          var paths = dependencies.map(function(s) {
            return path.basename(s.path);
          });
          assert.deepEqual(paths.slice(0, 3),
              ['base.js', 'fuel.js', 'vehicle.js']);
          assert.include(paths, 'boat.js');
          assert.include(paths, 'car.js');
          assert.include(paths, 'truck.js');
          assert.notInclude(paths, 'main-boat.js');
          assert.notInclude(paths, 'main-car.js');
          done();
        });
      });

      it('ignores files without requires or provides', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies-extra/**/*.js'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies();
          var paths = dependencies.map(function(s) {
            return path.basename(s.path);
          });
          assert.deepEqual(paths,
              ['base.js', 'parent.js', 'child.js']);
          done();
        });
      });

      it('includes scripts with goog.addDependency calls', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'adds-deps/+(lib|goog)/**/*.js',
          main: 'adds-deps/main.js'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies(
              path.join(fixtures, 'adds-deps', 'main.js'));
          var paths = dependencies.map(function(s) {
            return path.basename(s.path);
          });
          assert.deepEqual(paths,
              ['base.js', 'math.js', 'main.js', 'deps.js']);
          done();
        });
      });

      it('ignores requires when ignoreRequires matches', function(done) {
        var manager = new Manager({
          closure: false,
          cwd: fixtures,
          lib: 'dependencies-ignoreRequires/**/*.js',
          main: 'dependencies-ignoreRequires/main.js',
          ignoreRequires: '^meat\\..*'
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies(
              path.join(fixtures, 'dependencies-ignoreRequires', 'main.js'));
          var paths = dependencies.map(function(s) {
            return path.basename(s.path);
          });
          assert.deepEqual(paths,
              ['base.js', 'carrot.js', 'eggplant.js', 'main.js']);
          done();
        });
      });

    });

  });
});
