var ol = require('openlayers');
module.exports = function addChartLayers( map) {

		
		var US50_1 = new ol.layer.Tile({
			title: "US50_1 NORTH PACIFIC OCEAN   EASTERN PART NU/24",
			type: "overlay",
			minResolution: 1222.99245234375007,
			maxResolution: 78271.51695000000473,
			source: new ol.source.XYZ({
				url: '/mapcache/US50_1/{z}/{x}/{-y}.png',
				minZoom: 1,
				maxZoom: 7
			})
		});
		map.addLayer(US50_1);

}
