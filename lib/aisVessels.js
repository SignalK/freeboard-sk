var ol = require('openlayers');
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
	if(vessel === 'vessels.'+window.ownVessel || vessel === 'vessels.self') {
		//console.log('Ignore '+vessel+',  uuid:'+window.ownVessel);
		return;
	}
	
	var now = new Date().getTime();
	//10 min max
	now=now-600000;
	if(delta.updates){
		delta.updates.forEach(function(ais){
			var found, coord, radians, sog, uuid, mmsi, flag, port, name, vhf, cog, lat, lon, state;
			ais.values.forEach(function(value) {
				//console.log(value);
				if(value.path === 'navigation.position.latitude'){
					//console.log(value.value);
					lat=value.value;
				}
				if(value.path === 'navigation.position.longitude'){
					//console.log(value.value);
					lon=value.value;
				}
				if (value.path === 'navigation.position') {
                    //console.log('Pos:'+value.value.latitude+':'+value.value.longitude);
                    lat = value.value.latitude;
                    lon = value.value.longitude;
	            }

				if(value.path === 'navigation.courseOverGroundTrue'){
					cog=value.value;
					radians = value.value-(Math.PI*.5);//util.toRad(value.value-90);
				}
				if(value.path === 'navigation.speedOverGround'){
					sog = value.value;
				}
				if(vessel.indexOf('urn')>0){
					uuid = vessel.substring(vessel.lastIndexOf(".")+1,vessel.length);
				}
				if(value.path === 'mmsi'){
					mmsi = value.value;
				}
				if(value.path === 'flag'){
					flag = value.value;
				}
				if(value.path === 'port'){
					port = value.value;
				}
				if(value.path === 'name'){
					name = value.value;
				}
				if(value.path === 'communication.callsignVhf'){
					vhf = value.value;
				}
				if(value.path === 'navigation.state'){
					state = value.value;
				}
			});
			//if(vessel.indexOf('urn')>0) console.log("Updating ais data:"+JSON.stringify(ais));
			coord = ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
			
			aisSource.getFeatures().forEach(function (aisVessel) {
				if (aisVessel.get('context') === vessel){
					aisVessel.set('received',new Date().getTime());
					if(cog)aisVessel.set('cog',cog);
					if(sog)aisVessel.set('sog',sog);
					if(name)aisVessel.set('name',name);
					if(port)aisVessel.set('port',port);
					if(flag)aisVessel.set('flag',flag);
					if(vhf)aisVessel.set('vhf',vhf);
					if(state)aisVessel.set('state',state);
					setLocation(aisVessel, radians, coord);
					found="true";
					//if(vessel.indexOf('urn')>0) console.log("Updating ais coords:"+JSON.stringify(coord));
				}
				//cleanup after 10 min.
				if(aisVessel.get('received') < now){
					aisSource.removeFeature(layer);
				}
			});
			if(found)return;
			//if(vessel.indexOf('urn')>0) console.log(JSON.stringify(ais));
			//new one here
			//console.log("New vessel:"+vessel);
			var newVessel = new ol.Feature({
				context: vessel,
				received: new Date().getTime(),
				uuid: uuid,
				mmsi: mmsi,
				port: port,
				flag: flag,
				name: name,
				vhf: vhf,
				state: state,
				sog: sog,
				cog: cog
			});
			var imageSrc = 'img/white_ship.png';
			if(uuid)imageSrc='img/magenta_yacht.png';
			newVessel.setStyle(
				new ol.style.Style({
					image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
						anchor: [0.5, 0.46],
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						opacity: 0.75,
						rotation: 0,
						src: imageSrc
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
		//if(aisVessel.get('context').indexOf('urn')>0) console.log("Set position:"+coord);
	}
	if(radians && !isNaN(radians) ){
		aisVessel.getStyle().getImage().setRotation(radians);
	}
	
}
function setup(map){
	//aisOverlay = setAisOverlay(map);
	map.addLayer(aisLayer);
	window.wsServer.addSocketListener(this, "Ais");
	var sub = '{"context":"vessels.*","subscribe":[{"path":"name","period":10000},{"path":"uuid","period":10000},{"path":"communication.callsignVhf","period":10000},{"path":"mmsi","period":10000},{"path":"port","period":10000},{"path":"flag","period":10000},{"path":"navigation.position","period":10000},{"path":"navigation.state","period":10000},{"path":"navigation.courseOverGround*","period":10000},{"path":"navigation.speedOverGround","period":10000}]}';
	window.wsServer.send(sub);

}


module.exports = {
	onmessage: onmessage,
	setup:setup
};
