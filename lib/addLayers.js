var ol = require('openlayers');
var getTileUrl = require('./getTileUrl.js');
module.exports = function addChartLayers( map) {
/*	var NZ23 = new ol.layer.Tile({
		title: "NZ23",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ23')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ23',
				VERSION: '1.1.1'
			}
		})
	});*/
	//map.addLayer(NZ23);

/*	var openSeaMapLayer = new ol.layer.Tile({
		title: "OpenSeaMap",
		source: new ol.source.OSM({
			attributions: [
				new ol.Attribution({
					html: 'All maps &copy; ' +
					'<a href="http://www.openseamap.org/">OpenSeaMap</a>'
				}),
				ol.source.OSM.ATTRIBUTION
			],
			crossOrigin: null,
			url: 'http://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
		})
	});*/


	//map.addLayer(openSeaMapLayer);
}
