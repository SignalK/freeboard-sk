var path = require('path');

var request = require('supertest');

var Manager = require('../../lib/manager').Manager;
var Server = require('../../lib/server').Server;

var helper = require('../helper');

var assert = helper.assert;
var fixtures = path.join(__dirname, '..', 'fixtures');

describe('server', function() {

  describe('Server', function() {

    describe('constructor', function() {
      it('creates a Server instance', function() {
        var server = new Server({
          manager: new Manager({
            closure: false,
            cwd: fixtures
          })
        });

        assert.instanceOf(server, Server);
      });
    });

    describe('serves static files', function() {
      it('returns the file', function(done) {
        var server = new Server({
          manager: new Manager({
            closure: false,
            cwd: fixtures
          }),
          root: fixtures
        });
        request(server)
          .get('/basic/one.js')
          .expect(200, done);
      });
    });
  });
});
