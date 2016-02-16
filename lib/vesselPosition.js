var ol = require('openlayers');
var wsServer = require('./signalk.js');
var styleFunction = require('./styleFunction.js');
var menuControl = require('./menuControl.js');
var features = require('./features.js');
var util = require('./util.js');
var vesselPosition = new ol.Feature();
vesselPosition.setStyle(
	new ol.style.Style({
		image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
					anchor: [0.5, 0.46],
					anchorXUnits: 'fraction',
					anchorYUnits: 'fraction',
					opacity: 0.75,
					rotation: 0,
					src: 'img/ship_red.png',
					scale: 0.75
		}))
	}));

var FollowControl = menuControl.makeButton('V','follow-btn', function (e) {
	toggleFollowVessel();
});

var VesselUpControl = menuControl.makeButton('U','vessel-up-btn', function (e) {
	toggleVesselUp();
});

var markers = [];
var trackLine = new ol.geom.LineString(markers, 'XY');
var vesselTrack = new ol.Feature({
	geometry: trackLine,
	name: 'Vessel track'
});

var vesselOverlay = null;
var collection = new ol.Collection();
function setVesselOverlay(map){return new ol.layer.Vector({
 	 title: 'Vessel track',
   map: map,
   source: new ol.source.Vector({
     features: collection,
     useSpatialIndex: false // optional, might improve performance
   }),
  // style: overlayStyle,
  updateWhileAnimating: true, // optional, for instant visual feedback
  updateWhileInteracting: true // optional, for instant visual feedback
 });
}
/*
return new ol.FeatureOverlay({
		title: 'Vessel track',
		map: map,
		features: [vesselPosition, vesselTrack]
	});
	*/

var cog = 0;

function onmessage(delta) {
	//console.log(JSON.stringify(delta));
	if(delta.context != 'vessels.motu' && delta.context != 'vessels.self') return;

	if(delta.updates){
		delta.updates.forEach(function(update) {

			update.values.forEach(function(value) {
				//console.log(value);

				if(value.path === 'navigation.position'){
					//console.log(value.value.latitude);
					var coord = ol.proj.transform([value.value.longitude, value.value.latitude], 'EPSG:4326', 'EPSG:3857');

 					if(coord){
						console.log("Trackline Coord:"+coord);
            vesselPosition.setGeometry( new ol.geom.Point(coord) );
						if(cog==0){
							//use the track
							var lastCoord = trackLine.getLastCoordinate();

								if(lastCoord[0]!=coord[0] && lastCoord[1]!=coord[1] ){
									var radians =  Math.atan2((coord[0] - lastCoord[0]), (coord[1] - lastCoord[1])) ;
									setRotation(radians, coord);
								}
						}
					  trackLine.appendCoordinate(coord);
						if(followVessel){
							//recenter chart
							var screen = vesselOverlay.get('map').getSize();
							var pixel = [screen[0]*0.5,screen[1]*0.66];
							vesselOverlay.get('map').getView().centerOn(coord, screen, pixel);
						}
					}

				}
				if(value.path === 'navigation.courseOverGroundMagnetic'){
					if(value.value!==0){
						cog=1;
						//console.log("Heading mag:"+value.value);
						setRotation(value.value, trackLine.getLastCoordinate());
					}
				}
				//if(value.path === 'navigation.courseOverGroundTrue'){
				//	if(value.value!=0){
				//		cog=2;
				//		console.log("Heading true:"+value.value);
				//		setRotation(value.value, trackLine.getLastCoordinate());
				//	}
				//}
				if(value.path === 'navigation.speedOverGround'){
					//vesselPosition.getStyle().getImage().setRotation(value.value * Math.PI / 180 );
				}

			});
		});
	}
}

//center vessel
var followVessel = true;
function toggleFollowVessel(){
	followVessel=!followVessel;
	localStorage.setItem("sk-follow-vessel",JSON.stringify(followVessel));
}

//vessel or chart rotation
var vesselUp=true;
function toggleVesselUp(){
	vesselUp=!vesselUp;
	localStorage.setItem("sk-vessel-up",JSON.stringify(vesselUp));
	if(!vesselUp){
		vesselOverlay.get('map').getView().setRotation(0);
	}else{
		vesselOverlay.get('map').getView().setRotation(rotation);
		vesselPosition.getStyle().getImage().setRotation(rotation+radians);
	}
}

var rotation = 0;
function setRotation(radians, coord){
	//console.log("rotation:"+radians+", coord:"+coord+", vesselUp:"+vesselUp);
	if(vesselUp){
		if(Math.abs(Math.abs(rotation)-Math.abs(radians))>0.2){
			rotation = -radians;
			vesselOverlay.get('map').getView().rotate(rotation, coord);
			vesselPosition.getStyle().getImage().setRotation(0);
		}else{
			vesselPosition.getStyle().getImage().setRotation(rotation+radians);
		}
	}else{
		vesselPosition.getStyle().getImage().setRotation(radians);
	}
}
function setup(map){
	if(localStorage.getItem("sk-follow-vessel")){
		followVessel=JSON.parse(localStorage.getItem("sk-follow-vessel"));
	}
	if(localStorage.getItem("sk-vessel-up")){
		vesselUp=JSON.parse(localStorage.getItem("sk-vessel-up"));
	}
	vesselOverlay = setVesselOverlay(map);
        console.log(vesselOverlay);
	vesselOverlay.getSource().addFeature(vesselPosition);
        vesselOverlay.getSource().addFeature(vesselTrack);
	wsServer.addSocketListener(this);
	var sub = '{"context":"vessels.self","subscribe":[{"path":"navigation.position.*"},{"path":"navigation.courseOverGround*"},{"path":"navigation.speedOverGround"}]}';
	wsServer.send(sub);

	map.addControl(new FollowControl());
	$(".follow-btn").tooltip({ placement: 'right', title: 'Toggle follow vessel'});
	map.addControl(new VesselUpControl());
	$(".vessel-up-btn").tooltip({ placement: 'right', title: 'Toggle Vessel up/North up'});
}


module.exports = {
	onmessage: onmessage,
	setup:setup
};
