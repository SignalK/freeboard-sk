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

var FollowControl = menuControl.makeButton('V', 'follow-btn', function (e) {
    toggleFollowVessel();
});

var VesselUpControl = menuControl.makeButton('U', 'vessel-up-btn', function (e) {
    toggleVesselUp();
});

var markers = [];
var trackLine = new ol.geom.LineString(markers, 'XY');
var vesselTrack = new ol.Feature({
    geometry: trackLine,
    name: 'Vessel track'
});

//heading vector
var hdgMarkers = [];
var headingLine = new ol.geom.LineString(hdgMarkers, 'XY');
var vesselHdg = new ol.Feature({
    geometry: headingLine,
    name: 'Vessel heading'
    
});
vesselHdg.setStyle(
		new ol.style.Style({
		    stroke: new ol.style.Stroke({
			    color: 'rgba(221, 99, 0, 0.5)',
			    width: 4
		    })
        }));

//bearing vector
var brgMarkers = [];
var bearingLine = new ol.geom.LineString(hdgMarkers, 'XY');
var vesselBrg = new ol.Feature({
    geometry: bearingLine,
    name: 'Vessel bearing'
    
});
vesselBrg.setStyle(
		new ol.style.Style({
		    stroke: new ol.style.Stroke({
			    color: 'rgba(221, 99, 0, 0.5)',
			    width: 1
		    })
        }));

var vesselOverlay = null;
//var collection = new ol.Collection();
function setVesselOverlay(map,vessPos,vessTrack,vessHdg) {
  return new ol.FeatureOverlay({
 		title: 'Vessel track',
 		map: map,
 		features: [vessPos, vessTrack, vessHdg, vesselBrg]
 	});
}
/*    return new ol.layer.Vector({
        title: 'Vessel track',
        map: map,
        source: new ol.source.Vector({
            features: [vessPos, vessTrack],
            useSpatialIndex: false // optional, might improve performance
        }),
        //style: overlayStyle,
        updateWhileAnimating: true, // optional, for instant visual feedback
        updateWhileInteracting: true // optional, for instant visual feedback
    });
}*/


var rot, sog, magVar, cog=0;
var coord,wgs84Coord, lat, lon;
function onmessage(delta) {
    //console.log(JSON.stringify(delta));
    if (delta.context !== 'vessels.' + this.ownVessel && delta.context !== 'vessels.self' && delta.context !== 'vessels.motu') {
        console.log('Ignore '+delta.context+', not:'+this.ownVessel);
        return;
    }

    if (delta.updates) {
        delta.updates.forEach(function (update) {

            update.values.forEach(function (value) {
                //console.log(value.path);
            	if (value.path === 'navigation.magneticVariation') {
                    //console.log('Magnetic Variation(radians):'+value.value);
            		magVar = value.value;
	            }
                if (value.path === 'navigation.position') {
                    //console.log('Pos:'+value.value.latitude+':'value.value.longitude);
                    lat = value.value.latitude;
                    lon = value.value.longitude;
	            }
                if(lat && lon){
                  wgs84Coord=[lon, lat];
                  coord = ol.proj.transform(wgs84Coord, 'EPSG:4326', 'EPSG:3857');
                }

                if (value.path === 'navigation.courseOverGroundMagnetic') {
                    if (value.value !== 0) {
                        cog = 1;
                        //console.log("Heading magnetic (radians):"+value.value);
                        rot=value.value+magVar;
                        setRotation(rot, coord);
                    }
                }
                //if(value.path === 'navigation.courseOverGroundTrue'){
                //	if(value.value!=0){
                //		cog=2;
                //		console.log("Heading true:"+value.value);
                //		setRotation(value.value, trackLine.getLastCoordinate());
                //	}
                //}
                if (value.path === 'navigation.speedOverGround') {
                	//console.log("SOG:"+value.value);
                    sog=value.value;
                }

            });
        });
        if (coord && !isNaN(coord[0]) && !isNaN(coord[1])) {
            //console.log("Trackline Coord:" + coord);
            vesselPosition.setGeometry(new ol.geom.Point(coord));
            if (cog == 0) {
                //use the track
                var lastCoord = trackLine.getLastCoordinate();

                if (lastCoord[0] != coord[0] && lastCoord[1] != coord[1]) {
                    var radians = Math.atan2((coord[0] - lastCoord[0]), (coord[1] - lastCoord[1]));
                    setRotation(radians, coord);
                }
            }
            trackLine.appendCoordinate(coord);
           
            //do headingLine
            var nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], rot , sog*60);
            headingLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);
            
          //do bearingLine
            nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], rot , sog*30000);
            bearingLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);
            
           
            if (followVessel) {
                //recenter chart
                var screen = vesselOverlay.getMap().getSize();
                var pixel = [screen[0] * 0.5, screen[1] * 0.66];
                vesselOverlay.getMap().getView().centerOn(coord, screen, pixel);
            }
        }
    }
}

//center vessel
var followVessel = true;
function toggleFollowVessel() {
    followVessel = !followVessel;
    localStorage.setItem("sk-follow-vessel", JSON.stringify(followVessel));
}

//vessel or chart rotation
var vesselUp = true;
function toggleVesselUp() {
    vesselUp = !vesselUp;
    localStorage.setItem("sk-vessel-up", JSON.stringify(vesselUp));
    if (!vesselUp) {
        vesselOverlay.getMap().getView().setRotation(0);
        vesselPosition.getStyle().getImage().setRotation(0-rotation);
    } else {
        vesselOverlay.getMap().getView().setRotation(rotation);
        vesselPosition.getStyle().getImage().setRotation(0);
    }
}

var rotation = 0;
function setRotation(radians, coord) {
    if (vesselUp) {
        if (Math.abs(Math.abs(rotation) - Math.abs(radians)) > 0.2) {
            rotation = -radians;
            vesselOverlay.getMap().getView().rotate(rotation, coord);
            vesselPosition.getStyle().getImage().setRotation(0);
        } else {
            vesselPosition.getStyle().getImage().setRotation(rotation + radians);
        }
    } else {
        vesselPosition.getStyle().getImage().setRotation(radians);
    }
}
function setOwnVessel(ownVessel) {
    this.ownVessel = ownVessel;
}
function setup(map) {
    if (localStorage.getItem("sk-follow-vessel")) {
        followVessel = JSON.parse(localStorage.getItem("sk-follow-vessel"));
    }
    if (localStorage.getItem("sk-vessel-up")) {
        vesselUp = JSON.parse(localStorage.getItem("sk-vessel-up"));
    }
    //console.log("VesselPosition:"+vesselPosition));
    vesselOverlay = setVesselOverlay(map, vesselPosition, vesselTrack,vesselHdg);

    //vesselOverlay.getSource().addFeature(vesselPosition);
    //vesselOverlay.getSource().addFeature(vesselTrack);
    wsServer.addSocketListener(this);
    var sub = '{"context":"vessels.self","subscribe":[{"path":"navigation.position.*"},{"path":"navigation.magneticVariation"},{"path":"navigation.courseOverGround*"},{"path":"navigation.speedOverGround"}]}';
    wsServer.send(sub);

    map.addControl(new FollowControl());
    $(".follow-btn").tooltip({ placement: 'right', title: 'Toggle follow vessel'});
    map.addControl(new VesselUpControl());
    $(".vessel-up-btn").tooltip({placement: 'right', title: 'Toggle Vessel up/North up'});
}


module.exports = {
    onmessage: onmessage,
    setup: setup,
    setOwnVessel: setOwnVessel
};
