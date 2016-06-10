var $ = require('jquery');

var ol = require('openlayers');
var util = require('./util.js');
var vesselPosition = require('./vesselPosition.js');

var styleFunction = require('./styleFunction.js');
var wsServer = require('./signalk.js');
var menuControl = require('./menuControl.js');
//var map, connection;
var lat, lon, currentLat,currentLon, maxRadius=50.0, radius;

var guard = false;

var anchorCircleFeature = new ol.Feature();

var anchorFeatureOverlay;

var AnchorControl = menuControl.makeDrawerButton('A','anchor-btn','#anchorDrawer');

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

function getPutMsg(lat, lon, maxRadius){
	return { context: 'vessels.self',
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






function onmessage(delta, socket) {

	if(delta.updates){
		delta.updates.forEach(function(update) {
			//console.log(JSON.stringify(update));
			update.values.forEach(function (value) {
               // console.log(value);

                if (value.path === 'navigation.position.latitude') {
                    console.log(value.value);
                    currentLat = value.value;
                  }
                if (value.path === 'navigation.position.longitude') {
                      console.log(value.value);
                      currentLon = value.value;
                    }
               
			
				if(value.path==="navigation.anchor.currentRadius" && currentLat && currentLon){
						radius = util.haversine([lon,lat],[currentLon,currentLat]);
						//console.log("Radius:"+radius+", lat:"+lat+", lon:"+lon+", clat:"+currentLat+", clon:"+currentLon);
						$("#anchorPopupRadius").text(Math.round(value.value));
					}
				
				
			});
		});
	}
}

function setup(map){
	wsServer.addSocketListener(this);
	var sub = '{"context":"vessels.self","subscribe":[{"path":"navigation.anchor.*"}]}';
	vesselPosition.setup(map);
	wsServer.send(sub);
	$("#anchorPopupOn").change(anchorWatchToggle(map));
	map.addControl(new AnchorControl());
	$(".anchor-btn").tooltip({ placement: 'right', title: 'Anchor Watch'});
}

module.exports = {
	AnchorControl: AnchorControl,
	onmessage: onmessage,
	anchorWatchToggle:anchorWatchToggle,
	setup: setup
};
