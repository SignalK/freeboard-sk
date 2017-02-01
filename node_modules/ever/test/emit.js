var test = require('tape');
var ever = require('../');

test(function (t) {
    t.plan(2);
    
    var box = document.createElement('div');
    
    ever(box).on('click', function (ev) {
        t.pass('caught click with ever().on');
    });
    
    box.addEventListener('click', function (ev) {
        t.pass('caught click with addEventListener');
    }, false);
    
    setInterval(function () {
        ever(box).emit('click');
    }, 100);
});
