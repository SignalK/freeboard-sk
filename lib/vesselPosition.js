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
var headingLine = new ol.geom.LineString([], 'XY');
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
var bearingLine = new ol.geom.LineString([], 'XY');
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

//apparent wind vector
var appWindLine = new ol.geom.LineString([], 'XY');
var vesselAppWind = new ol.Feature({
    geometry: appWindLine,
    name: 'Apparent Wind'

});
vesselAppWind.setStyle(
		new ol.style.Style({
		    stroke: new ol.style.Stroke({
			    color: 'green',
			    width: 2
		    })
        }));

//true wind vector
var trueWindLine = new ol.geom.LineString([], 'XY');
var vesselTrueWind = new ol.Feature({
    geometry: trueWindLine,
    name: 'True Wind'

});
vesselTrueWind.setStyle(
		new ol.style.Style({
		    stroke: new ol.style.Stroke({
			    color: 'olive',
			    width: 2
		    })
        }));

var vesselOverlay = null;

function setVesselOverlay(map,vessPos,vessTrack,vessHdg, vessAppWind, vessTrueWind) {
  var collection = new ol.Collection();
  var featureOverlay = new ol.layer.Vector({
        title: 'Vessel',
        map: map,
        source: new ol.source.Vector({
            features: collection,
            useSpatialIndex: false // optional, might improve performance
        }),
        //style: overlayStyle,
        updateWhileAnimating: true, // optional, for instant visual feedback
        updateWhileInteracting: true // optional, for instant visual feedback
    });

    featureOverlay.getSource().addFeature(vessPos);
    featureOverlay.getSource().addFeature(vessTrack);
    featureOverlay.getSource().addFeature(vessHdg);
    featureOverlay.getSource().addFeature(vesselBrg);
    featureOverlay.getSource().addFeature(vessAppWind);
    featureOverlay.getSource().addFeature(vessTrueWind);
    return featureOverlay;
}


var cogm=0;
var sog=0;
var magVar=0;
var trueWind=0;
var cog=0;
var coord,wgs84Coord, lat, lon, awd, aws,twd,tws;
function onmessage(delta) {
    //console.log(JSON.stringify(delta));
    if (delta.context !== 'vessels.' + this.ownVessel && delta.context !== 'vessels.self' && delta.context !== 'vessels.motu') {
      //  console.log('Ignore '+delta.context+', not:'+this.ownVessel);
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
                        cogm=value.value+magVar;
                        setRotation(cogm, coord);
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
                if (value.path === 'environment.wind.angleApparent') {
                	//console.log("SOG:"+value.value);
                    awd=cogm+value.value;
                }
                if (value.path === 'environment.wind.speedApparent') {
                	//console.log("SOG:"+value.value);
                    aws=value.value;
                }
                if (value.path === 'environment.wind.directionMagnetic') {
                	//console.log("SOG:"+value.value);
                    twd=cogm+value.value;
                }
                if (value.path === 'environment.wind.speedOverGround') {
                	//console.log("SOG:"+value.value);
                    tws=value.value;
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
            var nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], cogm , sog*60);
            headingLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);

          //do bearingLine
            nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], cogm , sog*30000);
            bearingLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);

            //do appWindLine if we have wind
            if(awd && aws){
	            nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], awd , aws*60);
	            appWindLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);
            }

          //do trueWindLine if we have wind
            if(twd && tws){
	            nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], twd , tws*60);
	            trueWindLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);
            }

            if (followVessel) {
                //recenter chart
                var screen = vesselOverlay.get('map').getSize();
                var pixel = [screen[0] * 0.5, screen[1] * 0.66];
                vesselOverlay.get('map').getView().centerOn(coord, screen, pixel);
            }
        }
    }
}

//center vessel
var followVessel = true;
function toggleFollowVessel() {
    followVessel = !followVessel;
    console.log("Follow vessel:"+followVessel);
    localStorage.setItem("sk-follow-vessel", JSON.stringify(followVessel));
}

//vessel or chart rotation
var vesselUp = true;
function toggleVesselUp() {
    vesselUp = !vesselUp;
    localStorage.setItem("sk-vessel-up", JSON.stringify(vesselUp));
    if (!vesselUp) {
        vesselOverlay.get('map').getView().setRotation(0);
        vesselPosition.getStyle().getImage().setRotation(0-rotation);
    } else {
        vesselOverlay.get('map').getView().setRotation(rotation);
        vesselPosition.getStyle().getImage().setRotation(0);
    }
}

var rotation = 0;
function setRotation(radians, coord) {
    if (vesselUp) {
        if (Math.abs(Math.abs(rotation) - Math.abs(radians)) > 0.2) {
            rotation = -radians;
            vesselOverlay.get('map').getView().rotate(rotation, coord);
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
    vesselOverlay = setVesselOverlay(map, vesselPosition, vesselTrack,vesselHdg,vesselAppWind, vesselTrueWind);

    wsServer.addSocketListener(this, "Vessel");
    var sub = '{"context":"vessels.self","subscribe":[{"path":"environment.wind.speedOverGround"},{"path":"environment.wind.directionMagnetic"},{"path":"navigation.position.*"},{"path":"navigation.magneticVariation"},{"path":"environment.wind.angleApparent"},{"path":"navigation.courseOverGround*"},{"path":"navigation.speedOverGround"}]}';
    wsServer.send(sub);

    map.addControl(new VesselUpControl());
    $(".vessel-up-btn").tooltip({placement: 'right', title: 'Toggle Vessel up/North up'});

    $('#followVessel').bootstrapToggle({
          on: 'Follow Vessel',
          off: 'Dont Follow'
        });
    $("#followVessel").change(function(){
      toggleFollowVessel();
    });

}

module.exports = {
    onmessage: onmessage,
    setup: setup,
    setOwnVessel: setOwnVessel,
    toggleFollowVessel:toggleFollowVessel
};
