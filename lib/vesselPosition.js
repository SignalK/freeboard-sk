var ol = require('openlayers');

var vesselPosition = new ol.Feature();
vesselPosition.setStyle(
	new ol.style.Style({
		image: new ol.style.Circle({
			radius: 6,
			fill: new ol.style.Fill({
				color: '#3399CC'
			}),
			stroke: new ol.style.Stroke({
				color: '#000',
				width: 2
			})
		})
	}));

var markers = [];
var trackLine = new ol.geom.LineString(markers, 'XY');
var vesselTrack = new ol.Feature({
	geometry: trackLine,
	name: 'Vessel track'
}); 

function getVesselOverlay(map){ return new ol.FeatureOverlay({
		map: map,
		features: [vesselPosition, vesselTrack]
	});
}


function onmessage(delta) {
	if(delta.updates){
		delta.updates.forEach(function(update) {
			// console.log(update);
			update.values.forEach(function(value) {
				//console.log(value);
				if(value.value.latitude){
					//console.log(value.value.latitude);
					var coord = ol.proj.transform([value.value.longitude, value.value.latitude], 'EPSG:4326', 'EPSG:3857');
					vesselPosition.setGeometry( new ol.geom.Point(coord));
					trackLine.appendCoordinate(coord);
				}

			});
		});
	}
}


module.exports = {
	onmessage: onmessage,
	getVesselOverlay:getVesselOverlay
};