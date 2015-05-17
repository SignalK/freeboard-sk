var ol = require('openlayers');
var getTileUrl = require('./getTileUrl.js');
module.exports = function addChartLayers( map) {
	var NZ23 = new ol.layer.Tile({
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
	});
	var NZ46 = new ol.layer.Tile({
		title: "NZ46",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ46')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ46',
				VERSION: '1.1.1'
			}
		})
	});
	var NZ61 = new ol.layer.Tile({
		title: "NZ61",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ61')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ61',
				VERSION: '1.1.1'
			}
		})
	});

	var openSeaMapLayer = new ol.layer.Tile({
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
	});

	map.addLayer(NZ23);
	map.addLayer(NZ46);
	map.addLayer(NZ61);
	map.addLayer(openSeaMapLayer);
}