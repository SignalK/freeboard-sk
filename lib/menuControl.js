var $ = require('jquery');
//var bootstrap =require('bootstrap');
var ol = require('openlayers');
var vesselPosition = require('./vesselPosition.js');

var AnchorControl = makeDrawerButton('A','anchor-btn','#anchorDrawer');
var ChartControl = makeDrawerButton('C','chart-btn','#chartDrawer');
//draw points
var DrawControl = makeDrawerButton('D','draw-btn','#drawDrawer');

var FollowControl = makeButton('V','follow-btn',function (e) {
	vesselPosition.toggleFollowVessel();

});

var VesselUpControl = makeButton('U','vessel-up-btn',function (e) {
	vesselPosition.toggleVesselUp();

});

function makeDrawerButton(html, cssClass, drawerId){
	//draw points
	var DrawerControl = makeButton(html,cssClass, function (e) {
		$(drawerId).drawer('toggle');
	});
	return DrawerControl;
}

function makeButton(html, cssClass, handler){
	//draw points
	var ButtonControl = function (opt_options) {
		var options = opt_options || {};
		//charts
		var buttonButton = document.createElement('button');
		buttonButton.innerHTML = html;
		buttonButton.className=cssClass;
		//var this_ = this;
		var buttonHandleMenu = handler;
		buttonButton.addEventListener('click', buttonHandleMenu, false);
		buttonButton.addEventListener('touchstart', buttonHandleMenu, false);
		var buttonElement = document.createElement('div');
		buttonElement.className = cssClass+' ol-unselectable ol-control';
		buttonElement.appendChild(buttonButton);
		ol.control.Control.call(this, {
			element: buttonElement,
			target: options.target
		});

	};
	ol.inherits(ButtonControl, ol.control.Control);
	return ButtonControl;
}

module.exports={
	AnchorControl: AnchorControl,
	ChartControl: ChartControl,
	DrawControl: DrawControl,
	FollowControl: FollowControl,
	VesselUpControl: VesselUpControl,
	makeDrawerButton: makeDrawerButton,
	makeButton: makeButton
}
