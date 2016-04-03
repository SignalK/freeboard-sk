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
		source: new ol.source.XYZ({
			tileUrlFunction: function(coordinate){ return getTileUrl(coordinate,'WORLD')},
			maxResolution: 6,
			params: {
				LAYERS: 'WORLD',
				VERSION: '1.1.1'
			}
		})
	});

	var WORLD1 = new ol.layer.Tile({
		title: "WORLD1",
		type: 'base',
		source: new ol.source.XYZ({
			tileUrlFunction: function(coordinate){ return getTileUrl(coordinate,'WORLD1')},
			maxResolution: 6,
			params: {
				LAYERS: 'WORLD1',
				VERSION: '1.1.1'
			}
		})
	});

	map.addLayer(WORLD1);
	map.addLayer(WORLD);
	map.addLayer(OSM);
}
