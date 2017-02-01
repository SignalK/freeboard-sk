var u2r = require("../u2r");
var test = require("./shinout.test");


test.exe(function() {
  var url = "shinout.net";
  var r = u2r(url);
  test('equal', r.host, 'shinout.net', url + ': wrong host');
  test('equal', r.path, '/', url + ': wrong path');
  test('equal', r.port, '80', url + ': wrong port');
  test('equal', r.protocol, 'http', url + ': wrong protocol');
  test('result', url, true);
});


test.exe(function() {
  var url = "shinout.net/fogeae?fafae=r3j";
  var r = u2r(url);
  test('equal', r.host, 'shinout.net', url + ': wrong host');
  test('equal', r.path, '/fogeae?fafae=r3j', url + ': wrong path');
  test('equal', r.port, '80', url + ': wrong port');
  test('equal', r.protocol, 'http', url + ': wrong protocol');
  test('result', url, true);
});

test.exe(function() {
  var url = "shinout.net/fogeaefafae=r3j";
  var r = u2r(url);
  test('equal', r.host, 'shinout.net', url + ': wrong host');
  test('equal', r.path, '/fogeaefafae=r3j', url + ': wrong path');
  test('equal', r.port, '80', url + ': wrong port');
  test('equal', r.protocol, 'http', url + ': wrong protocol');
  test('result', url, true);
});



test.exe(function() {
  var url = "https://shinout.net/";
  var r = u2r(url);
  test('equal', r.host, 'shinout.net', url + ': wrong host');
  test('equal', r.path, '/', url + ': wrong path');
  test('equal', r.port, '443', url + ': wrong port');
  test('equal', r.protocol, 'https', url + ': wrong protocol');
  test('result', url, true);
});


test.exe(function() {
  var url = "http://hogehoge023r";
  var r = u2r(url);
  test('equal', r.host, 'hogehoge023r', url + ': wrong host');
  test('equal', r.path, '/', url + ': wrong path');
  test('equal', r.port, '80', url + ': wrong port');
  test('equal', r.protocol, 'http', url + ': wrong protocol');
  test('result', url, true);
});

test.exe(function() {
  var url = "http://no.de.jp.js.dot.net.dot.com/index.html.tpl.js.css.img?q=a&ab=wefwef";
  var r = u2r(url);
  test('equal', r.host, 'no.de.jp.js.dot.net.dot.com', url + ': wrong host');
  test('equal', r.path, '/index.html.tpl.js.css.img?q=a&ab=wefwef', url + ': wrong path');
  test('equal', r.port, '80', url + ': wrong port');
  test('equal', r.protocol, 'http', url + ': wrong protocol');
  test('result', url, true);
});


