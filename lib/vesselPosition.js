var ol = require('openlayers');

//var steelseries = require('./steelseries-min.js');
//var tween = require('./tween-min.js');
var util = require('./util.js');
// var d3 = require('d3');

var vesselPos = new ol.Feature();
vesselPos.setStyle(
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

//vessel circle
		var circleRadii = [100, 200, 300];
		var vesselCir = [];
		var circleLine = [];

		for (i = 0; i < circleRadii.length; i++) {
			circleLine[i] = new ol.geom.Circle([], circleRadii[i], 'XY');
			vesselCir[i] = new ol.Feature({
				geometry: circleLine[i],
				name: 'Vessel circle'
			});
			vesselCir[i].setStyle(
				new ol.style.Style({
					stroke: new ol.style.Stroke({
						color: 'rgba(255, 0, 0, 1.0)',
						width: 1
					})
				}));
			}

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

function setVesselOverlay(map, vessPos, vessTrack, vessHdg, vessAppWind, vessTrueWind, vessCir) {
	var collection = new ol.Collection();
	var featureOverlay = new ol.layer.Vector({
		title: 'Vessel',
		map: map,
		source: new ol.source.Vector({
			features: collection,
			useSpatialIndex: false // optional, might improve performance
		}),
		//style: overlayStyle,
		updateWhileAnimating: true,
		// optional, for instant visual feedback
		updateWhileInteracting: true // optional, for instant visual feedback
	});

	featureOverlay.getSource().addFeature(vessPos);
	featureOverlay.getSource().addFeature(vessTrack);
	featureOverlay.getSource().addFeature(vessHdg);
	featureOverlay.getSource().addFeature(vesselBrg);
	featureOverlay.getSource().addFeature(vessAppWind);
	featureOverlay.getSource().addFeature(vessTrueWind);
	for (i = 0; i < vessCir.length; i++){
		featureOverlay.getSource().addFeature(vessCir[i]);
	}
	return featureOverlay;
}

var cogm = 0;
var cogt = 0;
var headingT;
var headingM;
var sog = 0;
var sow = 0;
var dbt = 0;
var magVar = 0;
var trueWind = 0;
var cog = 0;
var coord, wgs84Coord, lat, lon, awd, aws, twd, tws;
var uuid, mmsi, flag, port, name, vhf, state;
//var rmcCourse = true;

function onmessage(delta) {

	if (!delta.context) {
		//console.log("Invalid msg for vesselPositon");
		return;
	}
	if (delta.context !== window.ownVessel && delta.context !== 'vessels.self') {
		//console.log('Ignore '+delta.context+', not:'+window.ownVessel);
		//console.log('Ignore '+delta.context);
		return;
	}
//	console.log("onmessage");
//	console.log(JSON.stringify(delta));
	if (delta.updates) {
		delta.updates.forEach(function (update) {

			update.values.forEach(function (value) {
				//console.log(value.path + '=' + JSON.stringify(value.value));
				if (value.path === 'notifications.environment.depth.belowSurface.alarmState') {
					//console.log('Depth alarm:' + value.value);
					if (value.value == "alarm") {
						dbsLCD.setLcdColor(steelseries.LcdColor.RED);
					} else if (value.value == "warn") {
						dbsLCD.setLcdColor(steelseries.LcdColor.YELLOW);
					} else {
						dbsLCD.setLcdColor(steelseries.LcdColor.BEIGE);
					}
				}
				if (value.path === 'propulsion.engine.coolantTemperature') {
					var engineTemp = value.value;
					if (localStorage.getItem("engineTempUserUnit") != null) {
						engineTempUserUnit = localStorage.getItem("engineTempUserUnit");
						//console.log("engineTempUserUnit: " + engineTempUserUnit);

						// convert to user units
						if (engineTempUserUnit == "C") {
						} else {
							engineTemp = util.cToFahr(engineTemp);
						}
					}
					//console.log('Engine Temperature:' + engineTemp + engineTempUserUnit);
					engineTempLCD.setValue(engineTemp);
				}
				if (value.path === 'navigation.magneticVariation') {
					//console.log('Magnetic Variation(radians):'+value.value);
					magVar = value.value;
				}
				if (value.path === 'navigation.position.latitude') {
					//console.log('Pos (lat):'+value.value);
					lat = value.value;
				}
				if (value.path === 'navigation.position.longitude') {
					//console.log('Pos (lon):'+value.value);
					lon = value.value;
				}
				if (value.path === 'navigation.position') {
					//console.log('Pos (lat):'+value.value);
					lat = value.value.latitude;
					lon = value.value.longitude;
				}

				//console.log('Pos (lat):' + lat + ',(lon):' + lon);
				if (lat && lon) {
					wgs84Coord = [lon, lat];
					coord = ol.proj.transform(wgs84Coord, 'EPSG:4326', 'EPSG:3857');
				}

				if (value.path === 'navigation.headingTrue') {
					if (value.value !== 0) {
						headingT = value.value;
						//console.log("headingT (radians):" + headingT);
					}
				} else if (value.path === 'navigation.headingMagnetic') {
					if (value.value !== 0) {
						if (cog < 3)
							cog = 3;
						headingM = value.value;
						headingT = (headingM + magVar) % (2 * Math.PI);
						if (cog == 3) {
							setRotation(headingT, coord);
							magHeadLCD.setValue(util.toDeg(headingM));
							trueHeadLCD.setValue(util.toDeg(headingT));
//							d3.select("#cogt").data([headingT]).text(function (d) {
//								return util.toDeg(d).toFixed(0);
//							});
//							d3.select("#cogm").data([headingM]).text(function (d) {
//								return util.toDeg(d).toFixed(0);
//							});
							//console.log("headingM (radians):" + headingM);
						}

					}
				}
				if (value.path === 'navigation.courseOverGroundMagnetic') {
					if (value.value !== 0) {
						if (cog < 2)
							cog = 2;
						//rmcCourse = false; //	we got at least one NMEA sentence with magnetic course data
						cogm = value.value;
						cogt = (value.value + magVar) % (2 * Math.PI);

						if (cog == 2) {
							headingM=cogm;
							headingT=cogt;
							setRotation(cogt, coord);
							trueHeadLCD.setValue(util.toDeg(cogt));
							magHeadLCD.setValue(util.toDeg(cogm));

							//try updating testSOG
							//console.log("Heading magnetic (radians):" + cogm);
//							d3.select("#cogm").data([cogm]).text(function (d) {
//								return util.toDeg(d).toFixed(0);
//							});
//							d3.select("#cogt").data([cogt]).text(function (d) {
//								return util.toDeg(d).toFixed(0);
//							});
						}
					}
				}
				//if (rmcCourse) {
				if (value.path === 'navigation.courseOverGroundTrue') {
					if (value.value != 0) {
						if (cog < 1)
							cog = 1;
						cogt = value.value;
						cogm = cogt - magVar;
						if (cogm < 0)
							cogm = cogm + (2 * Math.PI);
						//console.log("Course True: " + cogt.toFixed(1));
						if (cog == 1) {
							headingM=cogm;
							headingT=cogt;
							setRotation(value.value, trackLine.getLastCoordinate());
							magHeadLCD.setValue(util.toDeg(cogm));
							trueHeadLCD.setValue(util.toDeg(cogt));
						}
					}
				}
				//}
				if (value.path === 'navigation.speedOverGround') {
					sog = value.value;
					sogDisp = sog;
					if (localStorage.getItem("sogDisplayUnit") != null) {
						sogDisplayUnit = localStorage.getItem("sogDisplayUnit");
						//console.log("sogDisplayUnit: " + sogDisplayUnit);
						if (sogDisplayUnit == "Kt") {
							sogDisp = util.msToKnt(sog);
						} else if (sogDisplayUnit == "Mi/hr") {
							sogDisp = msToMoPerHr(sog);
						} else if (sogDisplayUnit == "km/hr") {
							sogDisp = msToKmPerHr(sog);
						} else {
							sogDisplayUnit = "m/s";
						}
					}
					//console.log("SOG: " + sogDisp.toFixed(1));
					sogLCD.setValue(sogDisp);
				}

				if (value.path === 'navigation.speedThroughWater') {
					stw = value.value;
					stwDisp = stw;
					if (localStorage.getItem("stwDisplayUnit") != null) {
						stwDisplayUnit = localStorage.getItem("stwDisplayUnit");
						//console.log("stwDisplayUnit: " + stwDisplayUnit);
						if (stwDisplayUnit == "Kt") {
							stwDisp = util.msToKnt(stw);
						} else if (stwDisplayUnit == "Mi/hr") {
							stwDisp = msToMoPerHr(stw);
						} else if (stwDisplayUnit == "km/hr") {
							stwDisp = msToKmPerHr(stw);
						} else {
							stwDisplayUnit = "m/s";
						}
					}
					//console.log("STW: " + stwDisp.toFixed(1));
					stwLCD.setValue(stwDisp);
				}

				if (value.path === 'environment.depth.belowSurface') {
					dbs = value.value;
					//convert to user units
					if (localStorage.getItem("depthUserUnit") != null) {
						depthUserUnit = localStorage.getItem("depthUserUnit");
						//console.log("depthUserUnit: " + depthUserUnit);
						if (depthUserUnit == "ft") {
							dbs = util.mToFt(dbs);
						} else if (depthUserUnit == "F") {
							dbs = mToF(dbs);
						}
					}
					//console.log("DBS: " + dbs.toFixed(2));
					dbsLCD.setValue(dbs);
					sparkArray.shift();

					if (dbs < sparkDepthOptions.chartRangeMin) {
						sparkArray.push(sparkDepthOptions.chartRangeMin)
					} else {
						sparkArray.push(dbs);
					}
					$('#depthSpark').sparkline(sparkArray, sparkDepthOptions);
				}

				if (value.path === 'environment.wind.angleApparent') {
					awd = value.value;
					if (awd > Math.PI) {
						awd = 2 * Math.PI - awd;
					}
					//console.log("windAngleApp: " + util.toDeg(awd).toFixed(1));
					windDir.setValueAnimatedLatest(util.toDeg(awd));
				}
				if (value.path === 'environment.wind.directionTrue') {
					twd = value.value;
					if (twd > Math.PI) {
						twd = 2 * Math.PI - twd;
					}
					//console.log("windDirectionTrue:" + util.toDeg(twd).toFixed(0));
					windDir.setValueAnimatedAverage(util.toDeg(twd));
				}
				if (value.path === 'environment.wind.speedApparent') {
					aws = value.value;
					//console.log("windSpeedApp:" + util.msToKnt(aws).toFixed(1));
					windDir.setValueTop(util.msToKnt(aws));
				}
				//                if (value.path === 'environment.wind.directionMagnetic') {
				//                    //console.log("SOG:"+value.value);
				//                    twd = value.value;
				//                }
				if (value.path === 'environment.wind.speedTrue') {
					tws = value.value;
					//console.log("windSpeedTrue:" + util.msToKnt(tws).toFixed(1));
					windDir.setValueBottom(util.msToKnt(tws));
				}
				if (value.path === 'uuid') {
					uuid = value.value;
				}
				if (value.path === 'mmsi') {
					mmsi = value.value;
				}
				if (value.path === 'flag') {
					flag = value.value;
				}
				if (value.path === 'port') {
					port = value.value;
				}
				if (value.path === 'name') {
					name = value.value;
				}
				if (value.path === 'communication.callsignVhf') {
					vhf = value.value;
				}
				if (value.path === 'navigation.state') {
					state = value.value;
				}

			});
		});
		if (coord && !isNaN(coord[0]) && !isNaN(coord[1])) {
			//console.log("Trackline Coord:" + coord);
			vesselPos.setGeometry(new ol.geom.Point(coord));
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
			// This line has width 4 and distance is for ten minutes
			var nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], headingT, sog * 600);
			headingLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);

			// do the circleLine
			for (i = 0; i < circleLine.length; i++){
				circleLine[i].setCenterAndRadius(coord, circleRadii[i], 'XY');
			}

			//do bearingLine
			// This line has width 1 and distance is for 30000 min
			nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], headingT, sog * 30000);
			bearingLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);

			//do appWindLine if we have wind
			if (awd && aws) {
				var correct_awd;
				if (typeof cogt !== 'undefined') {
					correct_awd = awd + cogt;
				}
				if (typeof headingT !== 'undefined') {
					correct_awd = awd + headingT;
				}
				correct_awd = correct_awd % (2. * Math.PI);
				//								console.log("awd: " + util.toDeg(awd));
				//                console.log("cogt: ", util.toDeg(cogt));
				//                console.log("correct_awd: ", util.toDeg(correct_awd));
				nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], correct_awd, aws * 60);
				appWindLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);
			}

			//do trueWindLine if we have wind
			if (twd && tws) {
				var correct_twd;
				if (typeof cogt !== 'undefined') {
					correct_twd = twd + cogt;
				}
				if (typeof headingT !== 'undefined') {
					correct_twd = twd + headingT;
				}
				correct_twd = correct_twd % (2. * Math.PI);
				nextCoord = util.destVincenty(wgs84Coord[1], wgs84Coord[0], correct_twd, tws * 60);
				trueWindLine.setCoordinates([coord, ol.proj.transform(nextCoord, 'EPSG:4326', 'EPSG:3857')]);
			}

			if (followVessel) {
				//recenter chart
				var screen = vesselOverlay.get('map').getSize();
				var pixel = [screen[0] * 0.5, screen[1] * 0.66];
				vesselOverlay.get('map').getView().centerOn(coord, screen, pixel);
			}
			if (cogt)
				vesselPos.set('cog', cogt);
			if (sog)
				vesselPos.set('sog', sog);
			vesselPos.set('context', delta.context);
			if (mmsi)
				vesselPos.set('mmsi', mmsi);
			if (name)
				vesselPos.set('name', name);
			if (port)
				vesselPos.set('port', port);
			if (flag)
				vesselPos.set('flag', flag);
			if (vhf)
				vesselPos.set('vhf', vhf);
			if (state)
				vesselPos.set('state', state);
		}
	}
}

//center vessel
var followVessel = true;

function toggleFollowVessel() {
	followVessel = !followVessel;
	console.log("Follow vessel:" + followVessel);
	localStorage.setItem("sk-follow-vessel", JSON.stringify(followVessel));

}

//vessel or chart rotation
var vesselUp = true;

function toggleVesselUp() {

	vesselUp = !vesselUp;
	localStorage.setItem("sk-vessel-up", JSON.stringify(vesselUp));
	if (!vesselUp) {
		vesselOverlay.get('map').getView().setRotation(0);
		vesselPos.getStyle().getImage().setRotation(0 - rotation);
	} else {
		vesselOverlay.get('map').getView().setRotation(rotation);
		vesselPos.getStyle().getImage().setRotation(0);
	}
}


var rotation = 0;

function setRotation(radians, coord) {

	if (vesselUp) {
		if (Math.abs(Math.abs(rotation) - Math.abs(radians)) > 0.2) {
			rotation = -(radians);
			vesselOverlay.get('map').getView().rotate(rotation, coord);
			vesselPos.getStyle().getImage().setRotation(0);
		} else {
			vesselPos.getStyle().getImage().setRotation(rotation + radians);
		}
	} else {
		vesselPos.getStyle().getImage().setRotation(radians);
	}
}


function setup(map) {
	$("#followVessel").bootstrapToggle({
		on: 'Follow Vessel',
		off: 'Dont Follow'
	});
	if (localStorage.getItem("sk-follow-vessel")) {
		followVessel = JSON.parse(localStorage.getItem("sk-follow-vessel"));
		if (followVessel) {
			$("#followVessel").bootstrapToggle('on');
		} else {
			$("#followVessel").bootstrapToggle('off');
		}
	}

	$("#vesselUp").bootstrapToggle({
		on: 'Vessel Up',
		off: 'North Up'
	});

	if (localStorage.getItem("sk-vessel-up")) {
		vesselUp = JSON.parse(localStorage.getItem("sk-vessel-up"));
		if (vesselUp) {
			$("#vesselUp").bootstrapToggle('on');
		} else {
			$("#vesselUp").bootstrapToggle('off');
		}
	}


	//console.log("vesselPos:"+vesselPos));
	vesselOverlay = setVesselOverlay(map, vesselPos, vesselTrack, vesselHdg, vesselAppWind, vesselTrueWind, vesselCir);
	map.addLayer(vesselOverlay);
	window.wsServer.addSocketListener(this, "Vessel");
	var sub = '{"context":"vessels.self","subscribe":[{"path":"environment.wind.speedTrue","period":1000},'
			+ '{"path":"environment.wind.directionTrue","period":1000},'
			+ '{"path":"navigation.position.*","period":1000},'
			+ '{"path":"navigation.magneticVariation","period":1000},'
			+ '{"path":"environment.wind.angleApparent","period":1000},'
			+ '{"path":"environment.wind.speedApparent","period":1000},'
			+ '{"path":"navigation.speedOverGround","period":1000},'
			+ '{"path":"navigation.speedThroughWater","period":1000},'
			+ '{"path":"navigation.courseOverGroundTrue","period":1000},'
			+ '{"path":"navigation.headingMagnetic","period":1000},'
			+ '{"path":"navigation.headingTrue","period":1000},'
			+ '{"path":"environment.depth.belowTransducer","period":1000},'
			+ '{"path":"environment.depth.belowSurface","period":1000},'
			+ '{"path":"environment.depth.belowKeel","period":1000},'
			+ '{"path":"notifications.environment.depth", "period":1000},'
			+ '{"path":"propulsion.engine.coolantTemperature", "period":1000}]}';
	window.wsServer.send(sub);


	$("#followVessel").change(function () {
		toggleFollowVessel();
	});


	$("#vesselUp").change(function () {
		toggleVesselUp();
	});



}

module.exports = {
//	initGauges: initGauges,
	onmessage: onmessage,
	setup: setup,
	toggleFollowVessel: toggleFollowVessel,
	toggleVesselUp: toggleVesselUp

}
