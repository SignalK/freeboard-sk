var $ = require('jquery');

var ol = require('openlayers');
//var nanoModal = require('nanomodal');
var vesselPosition = require('./vesselPosition.js');

var map, connection;
var lat, lon, currentLat,currentLon, maxRadius=50.0, radius;

var guard = false;
/*var dialogModal=$( "#anchorPopup" ).dialog({
	autoOpen: false,
	resizable: true,
	//height:140,
	modal: false,
	buttons: {
		"Start": function(modal) {
			guard=true;
			var putMsg = { context: 'vessels.self',
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
										  path: 'navigation.anchor',
										  value: {
											  maxRadius: maxRadius,
											  currentRadius: radius
										  }
									  }

								  ]
							  }
						  ]

						 };

			console.log(JSON.stringify(putMsg));
			//connection.send(JSON.stringify(putMsg)); 
			//modal.hide();
		},
		"Stop": function() {
			guard=false;
		},  
		"Reset": function() {
			lat=currentLat;
			lon=currentLon;
			document.querySelector("#anchorPopupLat").value=lat;
			document.querySelector("#anchorPopupLon").value=lon;
			document.querySelector("#anchorPopupRadius").value=0;
		}, 
		"+": function() {
			var maxRadius = +document.querySelector("#anchorPopupMaxRadius").value;
			document.querySelector("#anchorPopupMaxRadius").value=maxRadius+5;
		}
		, 
		"-": function() {
			var maxRadius = +document.querySelector("#anchorPopupMaxRadius").value;
			document.querySelector("#anchorPopupMaxRadius").value=maxRadius-5;
		},
		Hide: function() {
			$( this ).dialog( "close" );
		}
	}
});*/

var AnchorControl = function (opt_options) {
	var options = opt_options || {};
	var button = document.createElement('button');
	button.innerHTML = ' <img src="img/anchor44x38.png" alt="Anchor" class="img-button"> </i>';
	//button.innerHTML = 'A';
	button.className='img-button';
	var this_ = this;
	var handleMenu = function (e) {
		//pop the anchor box

		lat=currentLat;
		lon=currentLon;
		document.querySelector("#anchorPopupLat").value=lat;
		document.querySelector("#anchorPopupLon").value=lon;

		/*var dialogModal = nanoModal(document.querySelector("#anchorPopup"), {
			overlayClose: false, // Can't close the modal by clicking on the overlay. 
			buttons: [{
				text: "Start",
				handler: function(modal) {
					guard=true;
					var putMsg = { context: 'vessels.self',
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
												  path: 'navigation.anchor',
												  value: {
													  maxRadius: maxRadius,
													  currentRadius: radius
												  }
											  }

										  ]
									  }
								  ]

								 };

					console.log(JSON.stringify(putMsg));
					//connection.send(JSON.stringify(putMsg)); 
					//modal.hide();
				},
				primary: true
			},  
					  {
						  text: "Stop",
						  handler: function(modal) {
							  guard=false;
						  }
					  },  
					  {
						  text: "Reset",
						  handler: function(modal) {
							  lat=currentLat;
							  lon=currentLon;
							  document.querySelector("#anchorPopupLat").value=lat;
							  document.querySelector("#anchorPopupLon").value=lon;
							  document.querySelector("#anchorPopupRadius").value=0;
						  }
					  }, {
						  text: "+",
						  handler: function(modal) {
							  var maxRadius = +document.querySelector("#anchorPopupMaxRadius").value;
							  document.querySelector("#anchorPopupMaxRadius").value=maxRadius+5;
						  }
					  }, {
						  text: "-",
						  handler: function(modal) {
							  var maxRadius = +document.querySelector("#anchorPopupMaxRadius").value;
							  document.querySelector("#anchorPopupMaxRadius").value=maxRadius-5;
						  }
					  }, {
						  text: "Hide",
						  handler: "hide"
					  }]
		});*/

		document.querySelector("#anchorPopupLat").value=lat;
		document.querySelector("#anchorPopupLon").value=lon;
		document.querySelector("#anchorPopupMaxRadius").value=maxRadius;
		//document.querySelector("#saveFeaturePopupPath").value=data.file.name;
		//dialogModal.dialog("open");

	};
	button.addEventListener('click', handleMenu, false);
	button.addEventListener('touchstart', handleMenu, false);
	var element = document.createElement('div');
	element.className = 'img-button ol-unselectable ol-control';
	element.appendChild(button);
	ol.control.Control.call(this, {
		element: element,
		target: options.target
	});


};
ol.inherits(AnchorControl, ol.control.Control);

function toRad(n) {
	return n * Math.PI / 180;
};
function toDeg(n) {
	return n * 180 / Math.PI;
};

function haversine(c1, c2) {
	var lat1 = toRad(c1[1]);
	var lat2 = toRad(c2[1]);
	var deltaLatBy2 = (lat2 - lat1) / 2;
	var deltaLonBy2 = toRad(c2[0] - c1[0]) / 2;
	var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
		Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) *
		Math.cos(lat1) * Math.cos(lat2);
	return 2 * 6378137 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


function onmessage(delta) {

	if(delta.updates){
		delta.updates.forEach(function(update) {
			//console.log(update);
			update.values.forEach(function(value) {
				//console.log(value);
				if(value.value.latitude){
					currentLat=value.value.latitude;
					currentLon=value.value.longitude;
					if(guard && lat &&lon){
						//var coord = ol.proj.transform([lon,lat], 'EPSG:4326', 'EPSG:3857');
						//var cCoord = ol.proj.transform([currentLon,currentLat], 'EPSG:4326', 'EPSG:3857');
						//radius=new LineString([coord,cCoord]).getLength()
						radius = haversine([lon,lat],[currentLon,currentLat]);
						console.log("Radius:"+radius+", lat:"+lat+", lon:"+lon+", clat:"+currentLat+", clon:"+currentLon);
						document.querySelector("#anchorPopupRadius").value=Math.round(radius);
						sendCurrentRadius(radius);
					}
				}

			});
		});
	}
}

function sendCurrentRadius(radius){
	var putMsg = { context: 'vessels.self',
				  updates: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'vessels.self',
						  values: [
							  {
								  path: 'navigation.anchor',
								  value: {
									  currentRadius: radius
								  }
							  }

						  ]
					  }
				  ]

				 };

	console.log(JSON.stringify(putMsg));
	//connection.send(JSON.stringify(putMsg)); 
}

function setup(connection, map) {
	this.map=map;
	this.connection=connection;
}

module.exports = {
	onmessage: onmessage,
	AnchorControl:AnchorControl,
	setup: setup
};
