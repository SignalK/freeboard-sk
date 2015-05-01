var $ = require('jquery');
var ol = require('openlayers');
var Slideout = require('slideout');

var slideout = new Slideout({
	panel: document.getElementById('panel'),
	menu: document.getElementById('menu'),
	padding: 256,
	tolerance: 70,
	side: 'right'
});


var MenuControl = function (opt_options) {
    var options = opt_options || {};
    var button = document.createElement('button');
    button.innerHTML = 'M';
	button.className='rotate-north';
    var this_ = this;
    var handleMenu = function (e) {
        //this_.getMap().getView().setRotation(0);
		slideout.toggle();
    };
    button.addEventListener('click', handleMenu, false);
    button.addEventListener('touchstart', handleMenu, false);
    var element = document.createElement('div');
    element.className = 'rotate-north ol-unselectable ol-control';
    element.appendChild(button);
    ol.control.Control.call(this, {
        element: element,
        target: options.target
    });
	
	
};
ol.inherits(MenuControl, ol.control.Control);

module.exports=MenuControl;
