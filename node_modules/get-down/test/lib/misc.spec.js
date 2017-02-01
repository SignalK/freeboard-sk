var fs = require('fs');

var mock = require('mock-fs');

var misc = require('../../lib/misc');
var assert = require('../helper').assert;

describe('misc', function() {

  describe('copy()', function() {

    beforeEach(function() {
      mock({
        dir: {
          source1: 'one content',
          source2: 'two content'
        }
      });
    });
    afterEach(function() {
      mock.restore();
    });


    it('returns a promise of copied files', function(done) {
      misc.copy('dir/source1', 'dir/dest1')
          .then(function() {
            assert.isTrue(fs.existsSync('dir/dest1'));
            assert.equal(String(fs.readFileSync('dir/dest1')), 'one content');
            done();
          }, done);
    });

    it('resolves to dest path on success', function(done) {
      misc.copy('dir/source2', 'dir/dest2')
          .then(function(dest) {
            assert.equal(dest, 'dir/dest2');
            assert.isTrue(fs.existsSync('dir/dest2'));
            assert.equal(String(fs.readFileSync('dir/dest2')), 'two content');
            done();
          }, done);
    });

    it('is rejected if dest exists', function(done) {
      misc.copy('dir/source1', 'dir/source2')
          .then(function(dest) {
            done(new Error('Expected rejection'));
          }, function(err) {
            assert.instanceOf(err, Error);
            done();
          });
    });

  });

  describe('existingDirectory()', function() {

    beforeEach(function() {
      mock({
        'existing/dir': {},
        'some-file': 'file content'
      });
    });
    afterEach(function() {
      mock.restore();
    });

    it('resolves to path if directory exists', function(done) {
      misc.existingDirectory('existing/dir')
          .then(function(dir) {
            assert.equal(dir, 'existing/dir');
            done();
          }, done);
    });

    it('is rejected if directory does not exist', function(done) {
      misc.existingDirectory('bogus/dir')
          .then(function(dir) {
            done(new Error('Expected rejection'));
          }, function(err) {
            assert.instanceOf(err, Error);
            done();
          });
    });

    it('is rejected if entry is a file', function(done) {
      misc.existingDirectory('some-file')
          .then(function(dir) {
            done(new Error('Expected rejection'));
          }, function(err) {
            assert.instanceOf(err, Error);
            done();
          });
    });

  });

  describe('resolveFilePath()', function() {

    beforeEach(function() {
      mock({
        'existing-dir/existing-file': 'file content'
      });
    });
    afterEach(function() {
      mock.restore();
    });

    it('resolves to an existing parent dir plus file', function(done) {
      misc.resolveFilePath('existing-dir/new-file')
          .then(function(file) {
            assert.equal(file, 'existing-dir/new-file');
            done();
          }, done);
    });

    it('resolves to an existing dir plus basename', function(done) {
      misc.resolveFilePath('existing-dir', 'new-file')
          .then(function(file) {
            assert.equal(file, 'existing-dir/new-file');
            done();
          }, done);
    });

    it('rejects an existing file', function(done) {
      misc.resolveFilePath('existing-dir/existing-file')
          .then(function(file) {
            done(new Error('Expected failure'));
          }, function(err) {
            assert.instanceOf(err, Error);
            done();
          });
    });

    it('rejects a non-existent parent dir', function(done) {
      misc.resolveFilePath('bogus-dir/some-file')
          .then(function(file) {
            done(new Error('Expected failure'));
          }, function(err) {
            assert.instanceOf(err, Error);
            done();
          });
    });

  });

});
