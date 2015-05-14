var $ = require('jquery');

var ol = require('openlayers');

var vesselPosition = require('./vesselPosition.js');

var styleFunction = require('./styleFunction.js');
var wsServer = require('./signalk.js');
//var map, connection;
var lat, lon, currentLat,currentLon, maxRadius=50.0, radius;

var guard = false;

var anchorCircleFeature = new ol.Feature();

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
	var putMsg = getPutMsg(lat,lon,maxRadius);

	console.log(JSON.stringify(putMsg));
	wsServer.send(JSON.stringify(putMsg)); 
}

function getPutMsg(latitiude, longitude, maxRadius){
	return { context: 'vessels.self',
				  put: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'vessels.self',
						  values: [
							  {
								  path: 'navigation.anchor.position',
								  value: {
									  latitude: latitiude,
									  longitude: longitude,
									  altitude:0
								  }
							  },
							  {
								  path: 'navigation.anchor.maxRadius',
								  value: {
									  value: maxRadius
								  }
							  },
							  {
								  path: 'navigation.anchor.currentRadius.meta',
								  value: {
									  "displayName": "Anchor Watch",
									  "shortName": "Anchor Watch",
									  "warnMethod": "visual",
									  "warnMessage": "Check  anchor, near watch limit",
									  "alarmMethod": "sound",
									  "alarmMessage": "Dragging anchor",
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

$("#anchorPopupMaxRadiusSlide").on("slideStop", function(slideEvt) {
	if($(anchorPopupOn).prop('checked')){
		wsServer.send(JSON.stringify(getPutMsg(lat,lon,maxRadius)));
	}
});

function anchorWatchToggle(map){
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
										  path: 'navigation.anchor.currentRadius.meta',
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
			wsServer.send(JSON.stringify(putMsg)); 
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
	if($(anchorPopupOn).prop('checked')){
		wsServer.send(JSON.stringify(getPutMsg(lat,lon,maxRadius)));
	}
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
			//console.log(JSON.stringify(update));
			update.values.forEach(function(value) {
				//console.log(value);
				if(value.value.latitude){
					currentLat=value.value.latitude;
					currentLon=value.value.longitude;
				}
				if(value.path==="navigation.anchor.currentRadius"){
						radius = haversine([lon,lat],[currentLon,currentLat]);
						//console.log("Radius:"+radius+", lat:"+lat+", lon:"+lon+", clat:"+currentLat+", clon:"+currentLon);
						$("#anchorPopupRadius").text(Math.round(value.value));
					}
				
				
			});
		});
	}
}



module.exports = {
	onmessage: onmessage,
	anchorWatchToggle:anchorWatchToggle
};
