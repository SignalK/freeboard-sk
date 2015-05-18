var ol = require('openlayers');
var wsServer = require('./signalk.js');

var vesselPosition = new ol.Feature();
vesselPosition.setStyle(
	new ol.style.Style({
		image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
					anchor: [0.5, 20.0],
					anchorXUnits: 'fraction',
					anchorYUnits: 'pixels',
					opacity: 0.75,
					rotation: 0,
					src: 'img/ship_red.png'
		}))
	}));

var markers = [];
var trackLine = new ol.geom.LineString(markers, 'XY');
var vesselTrack = new ol.Feature({
	geometry: trackLine,
	name: 'Vessel track'
}); 

var vesselOverlay = null;
function setVesselOverlay(map){ return new ol.FeatureOverlay({
		title: 'Vessel track',
		map: map,
		features: [vesselPosition, vesselTrack]
	});
}

var cog = false;

function onmessage(delta) {
	if(delta.updates){
		delta.updates.forEach(function(update) {
			//console.log(update);
			update.values.forEach(function(value) {
				//console.log(value);
				if(value.path === 'navigation.position'){
					//console.log(value.value.latitude);
					var coord = ol.proj.transform([value.value.longitude, value.value.latitude], 'EPSG:4326', 'EPSG:3857');
					vesselPosition.setGeometry( new ol.geom.Point(coord));
					if(!cog){
						//use the track
						var lastCoord = trackLine.getLastCoordinate();
						var radians =  Math.atan2((coord[0] - lastCoord[0]), (coord[1] - lastCoord[1])) ;
						setRotation(radians, coord);
					}
					trackLine.appendCoordinate(coord);
					if(followVessel){
						//recenter chart
						var screen = vesselOverlay.getMap().getSize();
						var pixel = [screen[0]*0.5,screen[1]*0.66];
						//var extents = vesselOverlay.getMap().getView().calculateExtent(vesselOverlay.getMap().getSize());
						//console.log(extents);
						//var offset = (extents[1]-extents[3])*0.25;
						//console.log(coord);
						//coord[1]=coord[1]+offset;
						vesselOverlay.getMap().getView().centerOn(coord, screen, pixel);
					}
						
				}
				if(value.path === 'navigation.courseOverGroundTrue'){
					cog=true;
					setRotation(value.value * Math.PI / 180, trackLine.getLastCoordinate());
				}
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
}

//vessel or chart rotation
var vesselUp=true;
function toggleVesselUp(){
	vesselUp=!vesselUp;
	if(!vesselUp){
		vesselOverlay.getMap().getView().setRotation(0);
	}
}

var rotation = 0;
function setRotation(radians, coord){
	if(vesselUp){
		if(Math.abs(Math.abs(rotation)-Math.abs(radians))>0.2){
			rotation = -radians;
			vesselOverlay.getMap().getView().rotate(-radians,coord);
			vesselPosition.getStyle().getImage().setRotation(0);
		}else{
			vesselPosition.getStyle().getImage().setRotation(rotation+radians);
		}
	}else{
		vesselPosition.getStyle().getImage().setRotation(radians);
	}
}
function setup(map){
	vesselOverlay = setVesselOverlay(map);
	wsServer.addSocketListener(this);
	var sub = '{"context":"vessels.self","subscribe":[{"path":"navigation.position.*"},{"path":"navigation.courseOverGround*"},{"path":"navigation.speedOverGround"}]}';
	
	wsServer.send(sub);
}


module.exports = {
	onmessage: onmessage,
	setup:setup,
	toggleFollowVessel:toggleFollowVessel,
	toggleVesselUp,toggleVesselUp
};