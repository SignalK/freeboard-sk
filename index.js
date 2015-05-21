var $ =require('jquery');
window.$ = window.jQuery = require('jquery');
require('bootstrap');
require('bootstrap-drawer');
require('bootstrap-slider');
require('bootstrap-toggle');
var layerSwitcher = require('./lib/ol3-layerswitcher.js');

var ol = require('openlayers');
var addBaseLayers = require('./lib/addBaseLayers.js');
var addChartLayers = require('./lib/addLayers.js');
var drawFeatures = require('./lib/drawFeatures.js');
var features = require('./lib/features.js');
//var displayFeatureInfo = require('./lib/displayFeatureInfo.js');

var menuControl = require('./lib/menuControl.js');
var anchor = require('./lib/anchorControl.js');

var wsServer = require('./lib/signalk.js');
var simplify = require('./lib/simplify-js.js');
var vesselPosition = require('./lib/vesselPosition.js');
var measure = require('./lib/measure.js');
var view= new ol.View({
	center: ol.proj.transform([65, 50], 'EPSG:4326', 'EPSG:3857'),
	zoom: 3
})
//var settings = JSON.parse(localStorage.getItem("settings"));
//localStorage.setItem("settings", JSON.stringify(data));

var mousePositionControl = new ol.control.MousePosition({
	coordinateFormat: ol.coordinate.createStringXY(4),
	projection: 'EPSG:4326',
	// comment the following two lines to have the mouse position
	// be placed within the map.
	//className: 'custom-mouse-position',
	//target: document.getElementById('mouse-position'),
	undefinedHTML: '&nbsp;'
});

var map = new ol.Map({
	interactions: ol.interaction.defaults().extend([new ol.interaction.DragRotateAndZoom()]),
	target: 'map',
	layers: [],
	view: view,
	controls: ol.control.defaults({
		attributionOptions: {
			collapsible: true
		}
	}).extend([ mousePositionControl ]) 
});

//make map global
$('#map').data('map', map);
//use 'var map = $('#map').data('map');' to get it back

//reset any existing settings
if(localStorage.getItem("sk-zoom")){
	map.getView().setZoom(localStorage.getItem("sk-zoom"));
}
if(localStorage.getItem("sk-center")){
	map.getView().setCenter(JSON.parse(localStorage.getItem("sk-center")));
}
if(localStorage.getItem("sk-rotation")){
	map.getView().setRotation(localStorage.getItem("sk-rotation"));
}

//store location and zoom, etc
map.getView().on('change:resolution',function(evt){
	localStorage.setItem("sk-zoom",map.getView().getZoom());
});
map.getView().on('change:center',function(evt){
	localStorage.setItem("sk-center",JSON.stringify(map.getView().getCenter()));
});
map.getView().on('change:rotation',function(evt){
	localStorage.setItem("sk-rotation",map.getView().getRotation());
});

//add our layers
addBaseLayers(map);
addChartLayers(map);

map.addControl(layerSwitcher);


var rkScaleLine = new ol.control.ScaleLine({
	className:'ol-scale-line',
	units:'nautical'});
map.addControl(rkScaleLine);

function dispatch(delta) {
	//do nothing
}

function connect(){
	vesselPosition.setup(map);
	drawFeatures.setup( map);
	anchor.setup(map);
	menuControl.setup(map);
	measure.setup(map);
	features.setup(map);
}
$.ajax({
			url : "/signalk/api/v1/addresses",
			dataType: "text",
			success : function (data) {
				var jsonData = JSON.parse(data);
				var url=jsonData.websocketUrl;
				wsServer.connectDelta(url, dispatch, connect);
			}
		});





