var $ = require('jquery');

var ol = require('openlayers');
var util = require('./util.js');
var vesselPosition = require('./vesselPosition.js');

var styleFunction = require('./styleFunction.js');
var wsServer = require('./signalk.js');
var menuControl = require('./menuControl.js');
//var map, connection;
var lat;
var lon;
var maxRadius=50.0;
var radius=0.0;
var currentLat =0.0;
var currentLon = 0.0;
var guard = false;

var anchorCircle = new ol.geom.Circle([0.0,0.0]);
var anchorCircleFeature = new ol.Feature({
    geometry: anchorCircle,
    name: 'Anchor Watch Radius'
});

anchorCircleFeature.setStyle(
		new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'green',
					width: 2
				})
}));

var anchorFeatureOverlay= null;
function setAnchorOverlay(map, anchCircleFeature) {
	var collection = new ol.Collection();
	var featureOverlay = new ol.layer.Vector({
			title: 'Anchor Watch',
			map: map,
			source: new ol.source.Vector({
					features: collection,
					useSpatialIndex: false // optional, might improve performance
			}),
			//style: overlayStyle,
			updateWhileAnimating: true, // optional, for instant visual feedback
			updateWhileInteracting: true // optional, for instant visual feedback
	});
	featureOverlay.getSource().addFeature(anchCircleFeature);
	return featureOverlay;
}

var AnchorControl = menuControl.makeDrawerButton('A','anchor-btn','#anchorDrawer');

function startAnchorWatch(map) {
	guard=true;
	//place the anchor circle on screen
	var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
	anchorCircle.setCenterAndRadius(coord,maxRadius);
	anchorFeatureOverlay.setVisible(true);
	console.log("Add circle");
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


function anchorWatchToggle(map){
	return function(){
		console.log("Anchor watch");
		if($(this).prop('checked')){
			console.log("Switch on");
			startAnchorWatch(map);
		}else{
			guard=false;
			anchorFeatureOverlay.setVisible(false);
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
			console.log("Switch off");
			console.log(JSON.stringify(putMsg));
			wsServer.send(JSON.stringify(putMsg));
		}
	}
}


function onmessage(delta) {

	if (delta.context !== 'vessels.' + vesselPosition.ownVessel && delta.context !== 'vessels.self' && delta.context !== 'vessels.motu') {
		  //console.log('Ignore '+delta.context+', not:'+vesselPosition.ownVessel);
			return;
	}

	if(delta.updates){
		delta.updates.forEach(function(update) {
			//console.log(JSON.stringify(update));
			update.values.forEach(function (value) {
               // console.log(value);
				if (value.path === 'navigation.position') {
							 //console.log('Pos:'+value.value.latitude+':'value.value.longitude);
							 currentLat = value.value.latitude;
							 currentLon = value.value.longitude;
				 }

				if(value.path==="navigation.anchor.currentRadius" && currentLat && currentLon){
						$("#anchorPopupRadius").text(Math.round(value.value));
					}


			});
		});
	}
}

function setup(map){
	anchorFeatureOverlay = setAnchorOverlay(map, anchorCircleFeature);
  anchorFeatureOverlay.setVisible(false);
	wsServer.addSocketListener(this, "Anchor Watch");
	var sub = '{"context":"vessels.self","subscribe":[{"path":"navigation.anchor.*"}]}';
	wsServer.send(sub);
	$("#anchorPopupOn").change(anchorWatchToggle(map));


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
	anchorCircle.setRadius(maxRadius);
});

$("#anchorPopupMaxRadiusSlide").on("slideStop", function(slideEvt) {
	if($("#anchorPopupOn").prop('checked')){
		wsServer.send(JSON.stringify(getPutMsg(lat,lon,maxRadius)));
	}
});

$("#anchorPopupReset").on('click', function() {
	lat=currentLat;
	lon=currentLon;
	$("#anchorPopupLat").val(lat);
	$("#anchorPopupLon").val(lon);
	var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
	anchorCircle.setCenterAndRadius(coord,maxRadius);
	if($("#anchorPopupOn").prop('checked')){
		wsServer.send(JSON.stringify(getPutMsg(lat,lon,maxRadius)));
	}
});
module.exports = {
	AnchorControl: AnchorControl,
	onmessage: onmessage,
	anchorWatchToggle:anchorWatchToggle,
	setup: setup
};
