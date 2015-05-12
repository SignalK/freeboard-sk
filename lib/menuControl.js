var $ = require('jquery');
//var bootstrap =require('bootstrap');
var ol = require('openlayers')

var AnchorControl = makeDrawerButton('A','anchor-btn','#anchorDrawer');

var ChartControl = makeDrawerButton('C','chart-btn','#chartDrawer');

//draw points
var DrawControl = makeDrawerButton('D','draw-btn','#drawDrawer');

function makeDrawerButton(html, cssClass, drawerId){
	//draw points
	var DrawerControl = function (opt_options) {
		var options = opt_options || {};
		//charts
		var drawerButton = document.createElement('button');
		drawerButton.innerHTML = html;
		drawerButton.className=cssClass;
		//var this_ = this;
		var drawerHandleMenu = function (e) {
			$(drawerId).drawer('toggle');
		};
		drawerButton.addEventListener('click', drawerHandleMenu, false);
		drawerButton.addEventListener('touchstart', drawerHandleMenu, false);
		var drawerElement = document.createElement('div');
		drawerElement.className = cssClass+' ol-unselectable ol-control';
		drawerElement.appendChild(drawerButton);
		ol.control.Control.call(this, {
			element: drawerElement,
			target: options.target
		});

	};
	ol.inherits(DrawerControl, ol.control.Control);
	return DrawerControl;
}

module.exports={
	AnchorControl: AnchorControl,
    ChartControl: ChartControl,
	DrawControl: DrawControl,
	makeDrawerButton: makeDrawerButton
}
