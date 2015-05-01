var ol = require('openlayers');
var getTileUrl = require('./getTileUrl.js');
module.exports = function addBaseLayers( map) {
	var WORLD = new ol.layer.Tile({
	title: "WORLD",
	source: new ol.source.XYZ({
		tileUrlFunction: function(coordinate){ return getTileUrl(coordinate,'WORLD')},
		maxResolution: 6,
		params: {
			LAYERS: 'WORLD1',
			VERSION: '1.1.1'
		}
		})
});


var WORLD1 = new ol.layer.Tile({
	title: "WORLD1",
	source: new ol.source.XYZ({
		tileUrlFunction: function(coordinate){ return getTileUrl(coordinate,'WORLD1')},
		maxResolution: 6,
		params: {
			LAYERS: 'WORLD1',
			VERSION: '1.1.1'
		}
	})
});

map.addLayer(WORLD);
map.addLayer(WORLD1);
}