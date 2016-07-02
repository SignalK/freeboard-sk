var $ = require('jquery');

var ol = require('openlayers');
var util = require('./util.js');
var vesselPosition = require('./vesselPosition.js');
require('bootstrap-toggle');

var styleFunction = require('./styleFunction.js');
//var wsServer = require('./signalk.js');
var menuControl = require('./menuControl.js');
var Wad = require("web-audio-daw");
//var map, connection;
var lat;
var lon;
var maxRadius=50.0;
var radius=0.0;
var currentLat = 0.0;
var currentLon = 0.0;
var guard = false;
var edit = false;

var saw = new Wad({
    source  : 'sawtooth',
    volume  : 1.0,   // Peak volume can range from 0 to an arbitrarily high number, but you probably shouldn't set it higher than 1.
    loop    : true, // If true, the audio will loop. This parameter only works for audio clips, and does nothing for oscillators. 
    pitch   : 'A4',  // Set a default pitch on the constuctor if you don't want to set the pitch on play().
    detune  : 0,     // Set a default detune on the constructor if you don't want to set detune on play(). Detune is measured in cents. 100 cents is equal to 1 semitone.
    panning : -.5,    // Horizontal placement of the sound source. Possible values are from 1 to -1.

    env     : {      // This is the ADSR envelope.
        attack  : 0.0,  // Time in seconds from onset to peak volume.  Common values for oscillators may range from 0.05 to 0.3.
        decay   : 0.0,  // Time in seconds from peak volume to sustain volume.
        sustain : 1.0,  // Sustain volume level. This is a percent of the peak volume, so sensible values are between 0 and 1.
        hold    : 3.14, // Time in seconds to maintain the sustain volume level. If this is not set to a lower value, oscillators must be manually stopped by calling their stop() method.
        release : 0     // Time in seconds from the end of the hold period to zero volume, or from calling stop() to zero volume.
    },
    filter  : {
        type      : 'lowpass', // What type of filter is applied.
        frequency : 600,       // The frequency, in hertz, to which the filter is applied.
        q         : 1,         // Q-factor.  No one knows what this does. The default value is 1. Sensible values are from 0 to 10.
        env       : {          // Filter envelope.
            frequency : 800, // If this is set, filter frequency will slide from filter.frequency to filter.env.frequency when a note is triggered.
            attack    : 0.5  // Time in seconds for the filter frequency to slide from filter.frequency to filter.env.frequency
        }
    },
    vibrato : { // A vibrating pitch effect.  Only works for oscillators.
        shape     : 'sine', // shape of the lfo waveform. Possible values are 'sine', 'sawtooth', 'square', and 'triangle'.
        magnitude : 3,      // how much the pitch changes. Sensible values are from 1 to 10.
        speed     : 4,      // How quickly the pitch changes, in cycles per second.  Sensible values are from 0.1 to 10.
        attack    : 0       // Time in seconds for the vibrato effect to reach peak magnitude.
    },
    tremolo : { // A vibrating volume effect.
        shape     : 'sine', // shape of the lfo waveform. Possible values are 'sine', 'sawtooth', 'square', and 'triangle'.
        magnitude : 5,      // how much the volume changes. Sensible values are from 1 to 10.
        speed     : 4,      // How quickly the volume changes, in cycles per second.  Sensible values are from 0.1 to 10.
        attack    : 0       // Time in seconds for the tremolo effect to reach peak magnitude.
    }
});


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


function getPutMsg(lat, lon, maxRadius){
	return { context: 'vessels.self',
				  put: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'unknown',
						  values: [
								
							  {
								  path: 'navigation.anchor.position',
								  value: {
									  latitude: lat,
									  longitude: lon,
									  altitude:0.0
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
		edit=true;
		console.log("Anchor watch");
		if($(this).prop('checked')){
			console.log("Switch on");
			guard=true;
			//place the anchor circle on screen
			var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
			anchorCircle.setCenterAndRadius(coord,maxRadius);
			anchorFeatureOverlay.setVisible(true);
			console.log("Add circle");
			var putMsg =  { context: 'vessels.self',
					  put: [
							  {
								  timestamp: new Date().toISOString(),
								  source: 'unknown',
								  values: [
										{
											  path: 'navigation.anchor.state',
											  value: {
												  value: 'on'
											  }
										}

								  ]
							  }
						  ]

						 };
			console.log(JSON.stringify(putMsg));
			window.wsServer.send(JSON.stringify(putMsg));
			
		}else{
			try{
				saw.stop();
			}
			catch(e){
				console.error(e);
			}
			guard=false;
			anchorFeatureOverlay.setVisible(false);
			var putMsg = { context: 'vessels.self',
						  put: [
							  {
								  timestamp: new Date().toISOString(),
								  source: 'unknown',
								  values: [
										{
											  path: 'navigation.anchor.state',
											  value: {
												  value: 'off'
											  }
										}

								  ]
							  }
						  ]

						 };
			console.log("Switch off");
			console.log(JSON.stringify(putMsg));
			window.wsServer.send(JSON.stringify(putMsg));
		}
		edit=false;
	}
}


function onmessage(delta) {

	 if (!delta.context ){
	      //console.log("Invalid msg for vesselPositon");
	      return;
	    }
    if (delta.context !== 'vessels.' + window.ownVessel && delta.context !== 'vessels.self' ) {
        //console.log('Ignore '+delta.context+', not:'+window.ownVessel);
        //console.log('Ignore '+delta.context);
        return;
    }

    if(edit)return;
	if(delta.updates){
		delta.updates.forEach(function(update) {
			//console.log(JSON.stringify(update));
			update.values.forEach(function (value) {
               //console.log(value);
				
				if (value.path === 'navigation.position') {
					 //console.log('Anchor Pos:'+value.value.latitude+':'+value.value.longitude);
					 currentLat = value.value.latitude;
					 currentLon = value.value.longitude;
				 }
				if(value.path==="navigation.anchor.state"){
					console.log('Anchor Current State:'+value.value);
					if("on"===value.value){
						console.log('Switching:'+value.value);
						guard=true;
						$("#anchorPopupOn").bootstrapToggle('on');
					}else{
						guard=false;
						$("#anchorPopupOn").bootstrapToggle('off')
					}
					anchorFeatureOverlay.setVisible(guard);
				}
				if(value.path==="navigation.anchor.currentRadius"){
					//console.log('Anchor Current Radius:'+value.value);
					$("#anchorPopupRadius").text(Math.round(value.value));
					
				}
				if(value.path==="navigation.anchor.maxRadius"){
					maxRadius=Math.round(value.value);
					$("#anchorPopupMaxRadius").text(maxRadius);
					$("#anchorPopupMaxRadiusSlide").slider('setValue', maxRadius);
				}
				if(value.path==="navigation.anchor.position"){
					console.log('Anchor Current Position:'+JSON.stringify(value.value));
					lat=value.value.latitude;
					lon=value.value.longitude;
					$("#anchorPopupLat").val(lat);
					$("#anchorPopupLon").val(lon);
				}
				if(guard && value.path==="notifications.navigation.anchor.currentRadius.alarmState"){
					//console.log('Anchor Watch Status:'+value.value);
					if('alarm'===value.value){
						saw.play();
					}
				}
				//show if its relevant
				if(guard && lat && lon && maxRadius){
					var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
					anchorCircle.setCenterAndRadius(coord,maxRadius);
				}
			
			});
		});
	}
}

function setup(map){
	anchorFeatureOverlay = setAnchorOverlay(map, anchorCircleFeature);
	anchorFeatureOverlay.setVisible(false);
  	window.wsServer.addSocketListener(this, "Anchor Watch");
	var sub = '{"context":"vessels.self","subscribe":[{"path":"navigation.anchor.*","period":1000}, {"path":"notifications.navigation.anchor","period":5000}]}';
	window.wsServer.send(sub);
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
	edit=true;
	$("#anchorPopupMaxRadius").text(slideEvt.value);
	maxRadius=slideEvt.value;
	anchorCircle.setRadius(maxRadius);
});

$("#anchorPopupMaxRadiusSlide").on("slideStop", function(slideEvt) {
		window.wsServer.send(JSON.stringify(getPutMsg(lat,lon,maxRadius)));
		edit=false;
});

$("#anchorPopupReset").on('click', function() {
	edit=true;
	lat=currentLat;
	lon=currentLon;
	$("#anchorPopupLat").val(lat);
	$("#anchorPopupLon").val(lon);
	var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
	anchorCircle.setCenterAndRadius(coord,maxRadius);
	//if($("#anchorPopupOn").prop('checked')){
		window.wsServer.send(JSON.stringify(getPutMsg(lat,lon,maxRadius)));
	//}
	edit=false;
});
module.exports = {
	AnchorControl: AnchorControl,
	onmessage: onmessage,
	anchorWatchToggle:anchorWatchToggle,
	setup: setup
};
