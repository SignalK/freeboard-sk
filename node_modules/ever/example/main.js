var ever = require('../');
var box = document.querySelector('#box');

var state = false;
ever(box).on('click', function (ev) {
    ev.stopPropagation();
    state = !state;
    box.style['background-color'] = state ? 'red' : 'rgb(127,127,127)';
});

setInterval(function () {
    ever(box).emit('click');
}, 3000);
