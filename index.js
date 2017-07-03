//alert("index.js");
var $ = require('jquery');
window.$ = window.jQuery = require('jquery');
require('bootstrap');
require('bootstrap-drawer');
require('bootstrap-slider');
require('bootstrap-toggle');
var layerSwitcher = require('./lib/ol3-layerswitcher.js');

var ol = require('openlayers');
var baseLayers = require('./lib/addBaseLayers.js');
//var addChartLayers = require('./lib/addLayers.js');
var drawFeatures = require('./lib/drawFeatures.js');
var routes = require('./lib/routes.js');
var waypoints = require('./lib/waypoints.js');
var charts = require('./lib/charts.js');
var util = require('./lib/util.js');
var aisVessels = require('./lib/aisVessels.js');
//var displayFeatureInfo = require('./lib/displayFeatureInfo.js');
var vesselPosition = require('./lib/vesselPosition.js');
var menuControl = require('./lib/menuControl.js');
var anchor = require('./lib/anchorControl.js');

window.wsServer = require('./lib/signalk.js');
var simplify = require('./lib/simplify-js.js');

var measure = require('./lib/measure.js');
var view = new ol.View({
	center: ol.proj.transform([65, 50], 'EPSG:4326', 'EPSG:3857'),
	zoom: 3
})
//var settings = JSON.parse(localStorage.getItem("settings"));
//localStorage.setItem("settings", JSON.stringify(data));

var mousePositionControl = new ol.control.MousePosition({
	coordinateFormat: ol.coordinate.createStringXY(4),
	projection: 'EPSG:4326',
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
	}).extend([mousePositionControl])
});

//make map global
$('#map').data('map', map);
//use 'var map = $('#map').data('map');' to get it back

//reset any existing settings
if (localStorage.getItem("sk-zoom")) {
	map.getView().setZoom(localStorage.getItem("sk-zoom"));
}
if (localStorage.getItem("sk-center")) {
	map.getView().setCenter(JSON.parse(localStorage.getItem("sk-center")));
}
if (localStorage.getItem("sk-rotation")) {
	map.getView().setRotation(localStorage.getItem("sk-rotation"));
}

//store location and zoom, etc
map.getView().on('change:resolution', function (evt) {
	localStorage.setItem("sk-zoom", map.getView().getZoom());
});
map.getView().on('change:center', function (evt) {
	localStorage.setItem("sk-center", JSON.stringify(map.getView().getCenter()));
});
map.getView().on('change:rotation', function (evt) {
	localStorage.setItem("sk-rotation", map.getView().getRotation());
});

//add our layers
baseLayers.addBaseLayers(map);


map.addControl(layerSwitcher);


var rkScaleLine = new ol.control.ScaleLine({
	className: 'ol-scale-line',
	units: 'nautical'});
map.addControl(rkScaleLine);

function dispatch(delta) {
	//do nothing
}

function connect() {
	var sub = '{"context":"vessels.self","unsubscribe":[{"path":"*","policy":"instant"}]}';
	window.wsServer.send(sub);
	aisVessels.setup(map);
	vesselPosition.setup(map);
	drawFeatures.setup(map);
	anchor.setup(map);
	menuControl.setup(map);
	measure.setup(map);
	routes.setup(map);
	charts.setup(map);
	waypoints.setup(map);

}


var element = document.getElementById('mapPopup');

var popup = new ol.Overlay({
	element: element,
	positioning: 'bottom-center',
	stopEvent: false,
	offset: [0, -10]
});

$(element).popover({
	'placement': 'top',
	'html': true
});

map.addOverlay(popup);

// display popup on click
map.on('click', function (evt) {

	var feature = map.forEachFeatureAtPixel(evt.pixel,
			function (feature) {
				return feature;
			});
	if (feature) {
		var coordinates = feature.getGeometry().getCoordinates();
		popup.setPosition(coordinates);
		var context, name, vhf, port, flag, mmsi, state;
		context = name = vhf = port = flag = mmsi = state = '?';
		if (feature.get('context'))
			context = feature.get('context');
		if (feature.get('name'))
			name = feature.get('name').replace(/@/g, "");
		if (feature.get('state'))
			state = feature.get('state');
		if (feature.get('vhf'))
			vhf = feature.get('vhf');
		if (feature.get('port'))
			port = feature.get('port');
		if (feature.get('flag'))
			flag = feature.get('flag');
		$(element).attr('data-content', '<p>' + context + '<br/> Name:' + name + '<br/> Vhf:' + vhf + '<br/> State:' + state + '<br/> Port:' + port + ', Flag:' + flag + '</p>');
		$(element).popover('show');
	} else {
		$(element).popover('hide');
	}
});

var offline = false;

function toggleOffline() {
	offline = !offline;
	console.log('Toggle internet layers:' + offline);
	localStorage.setItem("sk-offline", JSON.stringify(offline));
	var mapTmp = $('#map').data('map');
	if (offline) {
		//remove internet maps
		baseLayers.removeInternetLayers(mapTmp);
	} else {
		//add internet maps
		baseLayers.addInternetLayers(mapTmp);
	}
}

$("#offline").bootstrapToggle({
		on: 'Offline',
		off: 'Online'
	});

	if (localStorage.getItem("sk-offline")) {
		offline = JSON.parse(localStorage.getItem("sk-offline"));
		if (offline) {
			$("#offline").bootstrapToggle('on');
			baseLayers.removeInternetLayers(map);
		} else {
			$("#offline").bootstrapToggle('off');
			baseLayers.addInternetLayers(map);
		}
	}else{
		//not used yet, so add layers
		$("#offline").bootstrapToggle('off');
			baseLayers.addInternetLayers(map);
	}

	$("#offline").change(function () {
		toggleOffline();
	});

	
$.ajax({
	url: "/signalk",
	dataType: "json",
	success: function (data) {
//        console.log(data);
		var url = data.endpoints.v1['signalk-http'];
		console.log(url);
		$.ajax({
			url: url + 'vessels/self',
			dataType: "json",
			success: function (data) {
				//var jsonData = JSON.parse(data);
				//console.log(JSON.stringify(data));
				//TODO: find  uuid or mmsi or ?
				if (data.uuid) {
					window.ownVessel = data.uuid;
				}
				if (typeof (Storage) !== "undefined") {
					if (data.environment) {
						localStorage.setItem("sparklinePoints", data.environment.depth.meta.sparkline.points.value);
						console.log("sparklinePoints: " + localStorage.getItem("sparklinePoints"));
						localStorage.setItem("sparklineMin", data.environment.depth.meta.sparkline.min.value);
						console.log("sparklineMin: " + localStorage.getItem("sparklineMin"));
						localStorage.setItem("depthUserUnit", data.environment.depth.meta.userUnit);
						console.log("depthUserUnit: " + localStorage.getItem("depthUserUnit"));
						var jsonData = data.environment.depth.belowSurface.meta.zones;
						alarmDepth = jsonData[0].upper;
						warnDepth = jsonData[1].upper;
						localStorage.setItem("alarmDepth", alarmDepth);
						localStorage.setItem("warnDepth", warnDepth);
						localStorage.setItem("sogDisplayUnit", data.navigation.speedOverGround.meta.unit);
						console.log("sogDisplayUnit: " + localStorage.getItem("sogDisplayUnit"));
						localStorage.setItem("stwDisplayUnit", data.navigation.speedThroughWater.meta.unit);
						console.log("stwDisplayUnit: " + localStorage.getItem("stwDisplayUnit"));
						localStorage.setItem("engineTempUserUnit", data.propulsion.engine.coolantTemperature.meta.unit);
						console.log("engineTempUserUnit: " + localStorage.getItem("engineTempUserUnit"));
					} else {
						alert("Please use another browser\n  this one has no local storage support!");
					}
				}
				if (window.ownVessel === 'undefined' && data.mmsi) {
					ownVessel = data.mmsi;
				}
				if (window.ownVessel === 'undefined' && data.url) {
					ownVessel = data.url;
				}
				console.log(window.ownVessel);

			}
		});
	}
});


//         var windDir;
//         var sogLCD;
//         var stwLCD;
//         var dbsLCD;
//         var magHeadLCD;
//         var trueHeadLCD;
//         var engineTempLCD;
         sparkArray = [];
         sparkArray.length = localStorage.getItem("sparklinePoints");
//         sparkDepthOptions;

         

            var tackAngle = 45;
            var areasCloseHaul = [
               steelseries.Section((0 - tackAngle), 0, 'rgba(0, 0, 220, 0.3)'),
               steelseries.Section(0, tackAngle, 'rgba(0, 0, 220, 0.3)')];
            var areasCloseHaulTrue = [
               steelseries.Section((360 - tackAngle), 0, 'rgba(0, 0, 220, 0.3)'),
               steelseries.Section(0, tackAngle, 'rgba(0, 0, 220, 0.3)')];
           
            windDir = new steelseries.MarineWindDirection('canvasWind', {
               lcdTitleStrings: ['Apparent', 'True'],
               useColorLabels: true,
               unitString: "Kt",
               lcdVisible: true,
               lcdColor: steelseries.LcdColor.BEIGE,
               pointSymbolsVisible: false,
               degreeScaleHalf: true,
               section: areasCloseHaul,
               area: areasCloseHaul,
               pointerTypeLatest: steelseries.PointerType.TYPE2,
               pointerTypeAverage: steelseries.PointerType.TYPE2,
               backgroundColor: steelseries.BackgroundColor.BROWN,
            });

            if (localStorage.getItem("sogDisplayUnit") != null) {
               sogDisplayUnit = localStorage.getItem("sogDisplayUnit");
            } else {
							sogDisplayUnit = "m/s";
						}

            sogLCD = new steelseries.DisplaySingle('sog', {
               width: 113,
               height: 50,
               unitString: sogDisplayUnit+" ",
               unitStringVisible: true,
               headerString: "SOG",
               lcdDecimals: 1,
               headerStringVisible: true,
               lcdColor: steelseries.LcdColor.BEIGE,
            });

            if (localStorage.getItem("stwDisplayUnit") != null) {
               stwDisplayUnit = localStorage.getItem("stwDisplayUnit");
            } else {
							stwDisplayUnit = "m/s";
						}

            stwLCD = new steelseries.DisplaySingle('stw', {
               width: 113,
               height: 50,
               unitString: stwDisplayUnit+" ",
               lcdDecimals: 1,
               unitStringVisible: true,
               headerString: "STW",
               digitalFont: true,
               headerStringVisible: true,
               lcdColor: steelseries.LcdColor.BEIGE,
            });

            if (localStorage.getItem("depthUserUnit") != null) {
               depthUserUnit = localStorage.getItem("depthUserUnit");
            } else {
							depthUserUnit = "m";
						}

            dbsLCD = new steelseries.DisplaySingle('depth', {
               height: 50,
               width: 226,
               valuesNumeric: true,
               unitString: depthUserUnit+" ",
               unitStringVisible: true,
               headerString: "Depth Below Surface",
               digitalFont: true,
               headerStringVisible: true,
               lcdColor: steelseries.LcdColor.BEIGE,
            });

            if (localStorage.getItem("engineTempUserUnit") != null) {
               engineTempUserUnit = localStorage.getItem("engineTempUserUnit");
            } else {
							engineTempUserUnit = "C";
						}

            magHeadLCD = new steelseries.DisplaySingle('magHead', {
               width: 113,
               height: 50,
               valuesNumeric: true,
               lcdDecimals: 0,
               unitString: "deg ",
               unitStringVisible: true,
               headerString: "Magnetic Heaing",
               digitalFont: true,
               headerStringVisible: true,
               lcdColor: steelseries.LcdColor.BEIGE,
            });

            trueHeadLCD = new steelseries.DisplaySingle('trueHead', {
               width: 113,
               height: 50,
               valuesNumeric: true,
               lcdDecimals: 0,
               unitString: "deg ",
               unitStringVisible: true,
               headerString: "True Heaing",
               digitalFont: true,
               headerStringVisible: true,
               lcdColor: steelseries.LcdColor.BEIGE,
            });

            engineTempLCD = new steelseries.DisplaySingle('engineTemp', {
               width: 226,
               height: 50,
               valuesNumeric: true,
               lcdDecimals: 0,
               unitString: engineTempUserUnit+" ",
               unitStringVisible: true,
               headerString: "Engine Temperature",
               digitalFont: true,
               headerStringVisible: true,
               lcdColor: steelseries.LcdColor.BEIGE,
            });

            var depthUnit = localStorage.getItem("depthUserUnit");
            var alarmDepth = localStorage.getItem("alarmDepth");
            var warnDepth = localStorage.getItem("warnDepth");
            var sparklineSize = localStorage.getItem("sparklinePoints");
            var sparklineMin = localStorage.getItem("sparklineMin")

            // switch to user units for depth

            if (depthUnit == "f") {
               alarmDepth = util.mToF(alarmDepth);
               warnDepth = util.mToF(warnDepth);
               sparklineMin = util.mToF(sparklineMin);
            } else if (depthUnit == "ft") {
               alarmDepth = util.mToFt(alarmDepth);
               warnDepth = util.mToFt(warnDepth);
               sparklineMin = util.mToFt(sparklineMin);
            }
            while (sparklineSize--)
               sparkArray.push(sparklineMin);
								sparkDepthOptions = {
               width: 226,
               height: 50,
               maxSpotColor: '',
               minSpotColor: '',
               fillColor: 'rgba(0,255,38, 1.0)',
               defaultPixelsPerValue: 1,
               chartRangeMin: sparklineMin,
               normalRangeMin: sparklineMin,
               normalRangeMax: alarmDepth,
               drawNormalOnTop: 'true',
               normalRangeColor: 'rgba(255, 0, 0, 1.0)'
            };
            
            console.log("init executed");



$.ajax({
	url: "/signalk",
	dataType: "json",
	success: function (data) {
		//var jsonData = JSON.parse(data);
		console.log(data);
		var url = data.endpoints.v1['signalk-ws'];
		console.log(url);
		var host = url.substring(url.indexOf("//") + 2);
		host = host.substring(0, host.indexOf("/"));

		window.wsServer.connectDelta(host, dispatch, connect);
	}
});
