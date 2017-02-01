var fs = require('fs');
var path = require('path');
var temp = require('temp').track();

var build = require('../../lib/build');

var helper = require('../helper');

var assert = helper.assert;
var fixtures = path.join(__dirname, '..', 'fixtures');


describe('build', function() {
  it('creates an output file', function(done) {
    // this test runs the compiler, increase the timeout value
    this.timeout(30000);
    var outputFile = temp.path({suffix: '.js'});
    var configFile = path.join(fixtures, 'config.json');
    build(configFile, outputFile, function(err) {
      assert.isNull(err);
      fs.exists(outputFile, function(exists) {
        assert.isTrue(exists);
        done();
      });
    });
  });
});
