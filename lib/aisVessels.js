var ol = require('openlayers');
var wsServer = require('./signalk.js');
var styleFunction = require('./styleFunction.js');
var menuControl = require('./menuControl.js');
var features = require('./features.js');
var util = require('./util.js');



var aisOverlay = null;
function setAisOverlay(map){
	return new ol.FeatureOverlay({
		title: 'AIS targets',
		map: map,
		features: []
	});
}
var aisSource = new ol.source.Vector({
  features: []
});

var aisLayer = new ol.layer.Vector({
	title:'AIS Targets',
  	source: aisSource
});

function onmessage(delta) {


	var vessel = delta.context;
	//dont do self
	//console.log(delta);
	if(vessel === 'vessels.'+ownVessel || vessel === 'vessels.self') return;
	var now = new Date().getTime();
	//10 min max
	now=now-600000;
	if(delta.updates){
		delta.updates.forEach(function(ais){
			var found, coord, radians, sog, mmsi, vhf, cog, lat, lon;
			ais.values.forEach(function(value) {
				//console.log(value);
				if(value.path === 'navigation.position.latitude'){
					console.log(value.value);
					lat=value.value;
				}
				if(value.path === 'navigation.position.longitude'){
					console.log(value.value);
					lon=value.value;
				}


				if(value.path === 'navigation.courseOverGroundTrue'){
					cog=value.value;
					radians = value.value-(Math.PI*.5);//util.toRad(value.value-90);
				}
				if(value.path === 'navigation.speedOverGround'){
					sog = value.value;
				}
				if(value.path === 'mmsi'){
					mmsi = value.value;
				}
				if(value.path === 'communication.callsignVhf'){
					vhf = value.value;
				}
			});
			coord = ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');

			aisSource.getFeatures().forEach(function (aisVessel) {
				if (aisVessel.get('context') === vessel){
					aisVessel.set('received',new Date().getTime());
					aisVessel.set('cog',cog);
					aisVessel.set('sog',sog);
					setLocation(aisVessel, radians, coord);
					found="true";
				}
				//cleanup after 10 min.
				if(aisVessel.get('received') < now){
					aisSource.removeFeature(layer);
				}
			});
			if(found)return;
			//new one here
			//console.log("New vessel:"+vessel);
			var newVessel = new ol.Feature({
				context: vessel,
				received: new Date().getTime(),
				mmsi: mmsi,
				vhf: vhf,
				sog: sog,
				cog: cog
			});
			newVessel.setStyle(
				new ol.style.Style({
					image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
						anchor: [0.5, 0.46],
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						opacity: 0.75,
						rotation: 0,
						src: 'img/white_ship.png'
					}))
				}));

			aisSource.addFeature(newVessel);
			setLocation(newVessel, radians, coord);
		});

	}
}


function setLocation(aisVessel, radians, coord){
	//console.log("rotation:"+radians+", coord:"+coord+", vessel:"+aisVessel.get('context'));
	if (coord && !isNaN(coord[0]) && !isNaN(coord[1])) {
		aisVessel.setGeometry(new ol.geom.Point(coord));
	}
	aisVessel.getStyle().getImage().setRotation(radians);

}
function setup(map){
	//aisOverlay = setAisOverlay(map);
	map.addLayer(aisLayer);
	wsServer.addSocketListener(this);
	var sub = '{"context":"vessels.*","subscribe":[{"path":"navigation.position.*","period":10000},{"path":"navigation.courseOverGround*","period":10000},{"path":"navigation.speedOverGround","period":10000}]}';
	wsServer.send(sub);

}


module.exports = {
	onmessage: onmessage,
	setup:setup
};
