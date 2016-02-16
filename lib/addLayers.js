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

	var NZ14600 = new ol.layer.Tile({
		title: "NZ14600",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ14600')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ14600',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ14600);

	var NZ614 = new ol.layer.Tile({
		title: "NZ614",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ614')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ614',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ614);

	var NZ6142_1 = new ol.layer.Tile({
		title: "NZ6142_1",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ6142_1')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ6142_1',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ6142_1);

	var NZ6151_1 = new ol.layer.Tile({
		title: "NZ6151_1", 
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ6151_1')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ6151_1',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ6151_1);

	var NZ61401 = new ol.layer.Tile({
		title: "NZ61401",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ61401')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ61401',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ61401);

	var NZ614_1 = new ol.layer.Tile({
		title: "NZ614_1",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ614_1')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ614_1',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ614_1);

	var NZ6142_2 = new ol.layer.Tile({
		title: "NZ6142_2",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ6142_2')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ6142_2',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ6142_2);

	var NZ6144 = new ol.layer.Tile({
		title: "NZ6144",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ6144')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ6144',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ6144);
	var NZ615 = new ol.layer.Tile({
		title: "NZ615",
		source: new ol.source.XYZ({
			tileUrlFunction: function (coordinate) {
				return getTileUrl(coordinate, 'NZ615')
			},
			minZoom: 7,
			maxZoom: 12,
			params: {
				LAYERS: 'NZ615',
				VERSION: '1.1.1'
			}
		})
	});
	map.addLayer(NZ615);

	map.addLayer(NZ23);
	map.addLayer(NZ46);
	map.addLayer(NZ61);
	map.addLayer(openSeaMapLayer);
}
