var ol = require('openlayers');
var $ = require('jquery');
window.$ = window.jQuery = require('jquery');
var getTileUrl = require('./getTileUrl.js');

var WORLD = new ol.layer.Tile({
		scale: 10000000000000,
		title: "WORLD",
		type: 'base',
		maxResolution: 156600,
		minResolution: 9000,
		source: new ol.source.XYZ({
			url: '/mapcache/WORLD/{z}/{x}/{-y}.png',
			minZoom: 0,
			maxZoom: 4
		})
	});

	var WORLD1 = new ol.layer.Tile({
		scale: 10000000000002,
		title: "WORLD1",
		type: 'base',
		visible: true,
		maxResolution: 40000,
		minResolution: 1000,
		source: new ol.source.XYZ({
			url: '/mapcache/WORLD1/{z}/{x}/{-y}.png',
			minZoom: 3,
			maxZoom: 6
		})
	});
	
function addBaseLayers( map) {
	map.addLayer(WORLD);
	map.addLayer(WORLD1);
	
}

var OSeaM = new ol.layer.Tile({ 
		scale: 10000000000004,
	  title: "OpenSeaMap",
	//  type: 'base',
	  visible: true,
	  source: new ol.source.OSM({ 
				//attributions: [ new ol.Attribution({ html: 'All maps &copy; ' + '<a href="http://www.openseamap.org/">OpenSeaMap</a>' }), ol.source.OSM.DATA_ATTRIBUTION ], 
				//crossOrigin: null, 
				url: 'http://tiles.openseamap.org/seamark/{z}/{x}/{y}.png' }) 
	}); 
	
var OSM = new ol.layer.Tile({
		scale: 10000000000003,
		title: 'OpenStreetMap',
	//	type: 'base',
		source: new ol.source.OSM() 
	});
	
function addInternetLayers( map) {
	console.log('Adding internet layers');
	var lyrs = map.getLayerGroup().getLayers();
	lyrs.insertAt(2,OSM);
  lyrs.insertAt(3,OSeaM);
}

function removeInternetLayers( map) {
	console.log('Removing internet layers:'+map.getLayers());
	var lyrs = map.getLayers();
	for (var x = 0; x < lyrs.getLength(); x++) {
		console.log('Check layer:'+ lyrs.item(x).get('title'));
		if (lyrs.item(x).get('title')=== 'OpenSeaMap') {
			map.removeLayer(lyrs.item(x));
		}
	}
	for (var x = 0; x < lyrs.getLength(); x++) {
		console.log('Check layer:'+ lyrs.item(x).get('title'));
		if (lyrs.item(x).get('title')=== 'OpenStreetMap') {
			map.removeLayer(lyrs.item(x));
		}
	}
}

module.exports = {
	addBaseLayers : addBaseLayers,
	addInternetLayers : addInternetLayers,
	removeInternetLayers : removeInternetLayers
}
