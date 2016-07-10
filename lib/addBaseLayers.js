var ol = require('openlayers');
var getTileUrl = require('./getTileUrl.js');
module.exports = function addBaseLayers( map) {
	var OSM = new ol.layer.Tile({
		title: 'OpenStreetMap',
		type: 'base',
		visible: true,
		source: new ol.source.OSM() 
	});

	var WORLD = new ol.layer.Tile({
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
		title: "WORLD1",
		type: 'base',
		maxResolution: 40000,
		minResolution: 1000,
		source: new ol.source.XYZ({
			url: '/mapcache/WORLD1/{z}/{x}/{-y}.png',
			minZoom: 3,
			maxZoom: 6
		})
	});

	map.addLayer(WORLD1);
	map.addLayer(WORLD);
	map.addLayer(OSM);
	
}
