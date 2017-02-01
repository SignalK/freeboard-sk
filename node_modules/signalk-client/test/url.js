var chai = require('chai');
var assert = chai.assert;
var url = require('url');

describe('URL Handling', function() {
  it('protocol, host, port and path should make url', function() {
    const expected = 'http://host:port/and/a/path';
    const urlObj = {
      protocol: 'http',
      hostname: 'host',
      port: 'port',
      pathname: 'and/a/path'
    };

    const result = url.format(urlObj);

    assert.equal(result, expected);
  });

  it('protocol, host and path should make url', function() {
    const expected = 'http://host/and/a/path';
    const urlObj = {
      protocol: 'http',
      hostname: 'host',
      port: undefined,
      pathname: 'and/a/path'
    };

    const result = url.format(urlObj);

    assert.equal(result, expected);
  });
});
