var $ = require('jquery');

var ol = require('openlayers');

var vesselPosition = require('./vesselPosition.js');

var styleFunction = require('./styleFunction.js');

//var map, connection;
var lat, lon, currentLat,currentLon, maxRadius=50.0, radius;

var guard = false;

var anchorCircleFeature = new ol.Feature();
/*anchorCircleFeature.setStyle(
	new ol.style.Style({
		image: new ol.style.Circle({
			
			stroke: new ol.style.Stroke({
				color: '#888',
				width: 1
			})
		})
	}));*/

var anchorFeatureOverlay;

function startAnchorWatch(map) {
	guard=true;
	//place the anchor circle on screen
	var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
	anchorCircleFeature.setGeometry( new ol.geom.Circle(coord,maxRadius));
	
	//anchorCircle.setRadius(maxRadius);
	anchorFeatureOverlay = new ol.FeatureOverlay({
		map: map,
		features: [anchorCircleFeature],
		style: new ol.style.Style({
			  stroke: new ol.style.Stroke({
				color: '#888',
				width: 1
			  })
			})
	});
	//$("#anchorPopupMaxRadius").value=maxRadius;
	var putMsg = { context: 'vessels.self',
				  put: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'vessels.self',
						  values: [
							  {
								  path: 'navigation.anchor.position',
								  value: {
									  latitude: lat,
									  longitude: lon,
									  altitude:0
								  }
							  },
							  {
								  path: 'navigation.anchor',
								  value: {
									  maxRadius: maxRadius,
									  currentRadius: radius
								  }
							  },
							  {
								  path: 'navigation.anchor.currentRadius',
								  value: {
									  "displayName": "Anchor Watch",
									  "shortName": "Anchor Watch",
									  "warnMethod": "visual",
									  "alarmMethod": "sound",
									  "zones": [
										  [0, maxRadius, "normal"],
										  [maxRadius, 999999, "alarm"]
									  ]
								  }
							  }

						  ]
					  }
				  ]

				 };

	console.log(JSON.stringify(putMsg));
	//window.app.socket.send(JSON.stringify(putMsg)); 
}

//anchor slider
$("#anchorPopupMaxRadiusSlide").slider({
	min: 10,
	max: 500,
	scale: 'logarithmic',
	step: 1,
	value: 50
});
$("#anchorPopupMaxRadiusSlide").on("slide", function(slideEvt) {
	$("#anchorPopupMaxRadius").text(slideEvt.value);
	maxRadius=slideEvt.value;
	anchorCircleFeature.getGeometry().setRadius(maxRadius);
});

function anchorWatchToggle(map, socket){
	return function(){
		if($(this).prop('checked')){
			startAnchorWatch(map);
		}else{
			guard=false;
			map.removeOverlay(anchorFeatureOverlay);
			var putMsg = { context: 'vessels.self',
						  put: [
							  {
								  timestamp: new Date().toISOString(),
								  source: 'vessels.self',
								  values: [
									  {
										  path: 'navigation.anchor.currentRadius',
										  value: {
											  "displayName": "Anchor Watch",
											  "shortName": "Anchor Watch",
											  "warnMethod": "visual",
											  "alarmMethod": "sound",
											  "zones": [ ]
										  }
									  }

								  ]
							  }
						  ]

						 };

			console.log(JSON.stringify(putMsg));
			socket.send(JSON.stringify(putMsg)); 
		}
	}
}


$("#anchorPopupReset").on('click', function() {
	lat=currentLat;
	lon=currentLon;
	$("#anchorPopupLat").val(lat);
	$("#anchorPopupLon").val(lon);
	var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
	anchorCircleFeature.setGeometry( new ol.geom.Circle(coord,maxRadius));
});

function toRad(n) {
	return n * Math.PI / 180;
};
function toDeg(n) {
	return n * 180 / Math.PI;
};

function haversine(c1, c2) {
	var lat1 = toRad(c1[1]);
	var lat2 = toRad(c2[1]);
	var deltaLatBy2 = (lat2 - lat1) / 2;
	var deltaLonBy2 = toRad(c2[0] - c1[0]) / 2;
	var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
		Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) *
		Math.cos(lat1) * Math.cos(lat2);
	return 2 * 6378137 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


function onmessage(delta, socket) {

	if(delta.updates){
		delta.updates.forEach(function(update) {
			//console.log(update);
			update.values.forEach(function(value) {
				//console.log(value);
				if(value.value.latitude){
					currentLat=value.value.latitude;
					currentLon=value.value.longitude;
					if(guard && lat &&lon){
						//var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
						//var cCoord = ol.proj.transform([currentLon,currentLat], 'EPSG:4326', 'EPSG:3857');
						//radius=new LineString([coord,cCoord]).getLength()
						radius = haversine([lon,lat],[currentLon,currentLat]);
						console.log("Radius:"+radius+", lat:"+lat+", lon:"+lon+", clat:"+currentLat+", clon:"+currentLon);
						$("#anchorPopupRadius").text(Math.round(radius));
						sendCurrentRadius(socket, radius);
					}
				}

			});
		});
	}
}

function sendCurrentRadius(socket, radius){
	var putMsg = { context: 'vessels.self',
				  updates: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'vessels.self',
						  values: [
							  {
								  path: 'navigation.anchor',
								  value: {
									  currentRadius: radius
								  }
							  }

						  ]
					  }
				  ]

				 };

	console.log(JSON.stringify(putMsg));
	socket.send(JSON.stringify(putMsg)); 
}



module.exports = {
	onmessage: onmessage,
	anchorWatchToggle:anchorWatchToggle
};
