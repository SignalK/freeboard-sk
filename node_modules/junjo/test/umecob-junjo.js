var umecob = require('../lib/umecob');

var u2 = new umecob({starts: [function(params) {
  params.tpl_id = __dirname + '/' + params.tpl_id + '.html';
}]});

var u = new umecob({sync: true, sub: u2});

var result = u.run(__dirname + '/tpl.html', {
  hoge: "fad",
  afsd: "f"
});

console.log(result);
console.log('-----------------------------------');
var $j = u2.run('tpl', {
  hoge: "fad",
  afsd: "f"
});

$j.next(function(err, out) {
  console.log(out);
});
