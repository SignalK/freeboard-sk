var $ = require('jquery');
var ol = require('openlayers');
var styleFunction = require('./styleFunction.js');
var menuControl = require('./menuControl.js');
require('bootstrap-select');
//var setupDragAndDrop = require('./setupDragAndDrop.js');
var nanoModal= require('nanomodal');
var wsServer = require('./signalk.js');
var dragAndDropInteraction = new ol.interaction.DragAndDrop({
	formatConstructors: [ol.format.GPX, ol.format.GeoJSON, ol.format.IGC, ol.format.KML, ol.format.TopoJSON]
});

//draw points
//var DrawControl = menuControl.makeDrawerButton('D','draw-btn','#drawDrawer');


//draw edit features
// create a vector layer used for editing
var vector_layer = new ol.layer.Vector({
	title: "Routes Layer",
	name: 'edit_vector_layer',
	source: new ol.source.Vector(),
	style: styleFunction
});

var geomType = 'Point';

function setGeomType(map, type){
	console.log('Geom,interaction:'+type);
	geomType=type;
	if($("#drawPopupAdd").prop('checked')){
		addDrawInteraction(map);
	} 
	
}
// make interactions global so they can later be removed
var select_interaction,
	draw_interaction,
	modify_interaction;

// build up modify interaction
// needs a select and a modify interaction working together
function addModifyInteraction(map) {
	// remove draw interaction
	console.log("Select Modify Interaction:"+geomType);
	map.removeInteraction(draw_interaction);
	map.removeInteraction(modify_interaction);
	map.removeInteraction(select_interaction);
	if(dragAndDropInteraction) map.removeInteraction(dragAndDropInteraction);
	// create select interaction
	select_interaction = new ol.interaction.Select({
		// make sure only the desired layer can be selected
		layers: function(vect_layer) {

			return vect_layer.get('name') === 'edit_vector_layer';

		}
	});
	map.addInteraction(select_interaction);

	// grab the features from the select interaction to use in the modify interaction
	var selected_features = select_interaction.getFeatures();
	// when a feature is selected...
	selected_features.on('add', function(event) {
		// grab the feature
		var feature = event.element;
		console.log("Selected feature:"+feature.getId());
		// ...listen for changes and save them
		//feature.on('change', saveData);
		// listen to pressing of delete key, then delete selected features
		$(document).on('keyup', function(event) {
			if (event.keyCode == 46) {
				// remove all selected features from select_interaction and edit_vector_layer
				selected_features.forEach(function(selected_feature) {
					var selected_feature_id = selected_feature.getId();
					// remove from select_interaction
					selected_features.remove(selected_feature);
					// features aus vectorlayer entfernen
					var vectorlayer_features = vector_layer.getSource().getFeatures();
					vectorlayer_features.forEach(function(source_feature) {
						var source_feature_id = source_feature.getId();
						if (source_feature_id === selected_feature_id) {
							// remove from edit_vector_layer
							vector_layer.getSource().removeFeature(source_feature);
							// save the changed data
							//saveData();
						}
					});
				});
				// remove listener
				$(document).off('keyup');
			}
		});
	});
	// create the modify interaction
	console.log("Add modify feature:"+selected_features.length);
	modify_interaction = new ol.interaction.Modify({
		features: selected_features,
		// delete vertices by pressing the SHIFT key
		deleteCondition: function(event) {
			return ol.events.condition.shiftKeyOnly(event) &&
				ol.events.condition.singleClick(event);
		}
	});
	// add it to the map
	map.addInteraction(modify_interaction);
	console.log("Added modify feature");
}

// creates a draw interaction
function addDrawInteraction(map) {
	// remove other interactions
	console.log("Select Draw Interaction:"+geomType);
	if(dragAndDropInteraction)map.removeInteraction(dragAndDropInteraction);
	map.removeInteraction(select_interaction);
	map.removeInteraction(modify_interaction);
	map.removeInteraction(draw_interaction);
	// create the interaction
	draw_interaction = new ol.interaction.Draw({
		source: vector_layer.getSource(),
		type: /** @type {ol.geom.GeometryType} */ geomType
	});
	// add it to the map
	map.addInteraction(draw_interaction);

	// when a new feature has been drawn...
	draw_interaction.on('drawend', function(event) {
		// create a unique id
		// it is later needed to delete features
		var id = uid();
		// give the feature this id
		event.feature.setId(id);
		// save the changed data
		//saveData(); 
	});
}


							
function  toggleAction(map, action){
	//return function(){
	console.log(action);
	if(action === 'Add'){
		addDrawInteraction(map);
		$("#drawPopupGeom .btn").removeAttr('disabled');
	}
	if(action === 'Edit'){
		addModifyInteraction(map);
		$("#drawPopupGeom .btn").attr('disabled', 'disabled');
	}
	if(action === 'Import'){
		addDragAndDropInteraction(map);
		$("#drawPopupGeom .btn").attr('disabled', 'disabled');
	}
	//}
}

var dialogModal = nanoModal(document.querySelector("#saveFeaturePopup"), {
			overlayClose: false, // Can't close the modal by clicking on the overlay. 
			buttons: [{
				text: "Save",
				handler: function(modal) {
					var data = new ol.format.GeoJSON().writeFeaturesObject(vector_layer.getSource().getFeatures(), {
						featureProjection: 'EPSG:3857',
						dataProjection: 'EPSG:4326'
					});
					var name = document.querySelector("#saveFeaturePopupName").value;
					var desc = document.querySelector("#saveFeaturePopupDesc").value;
					var type = document.querySelector('#drawPopupGeom :checked').value;
					var path = 'resources.waypoints';
					//if(type === 'Point') path = 'waypoints';
					if(type === 'LineString') path = 'resources.routes';
					if(type === 'Polygon') path = 'resources.regions';
					var putMsg = { context: 'vessels.self',
								  put: [
									  {
										  timestamp: new Date().toISOString(),
										  source: 'vessels.self',
										  values: [
											  {
												  path: path+'.'+name,
												  value: {
													  name: name,
													  description: desc,
													  mimetype: 'application/vnd.geo+json',
													  payload: data
												  }
											  }

										  ]
									  }
								  ]

								 };

					console.log(JSON.stringify(putMsg));
					wsServer.send(JSON.stringify(putMsg)); 

					modal.hide();
				},
				primary: true
			}, {
				text: "Cancel",
				handler: "hide"
			}]
		});


// shows data in textarea
// replace this function by what you need
function saveData() {
	// get the format the user has chosen
	try {
		dialogModal.show();
	} catch (e) {
		// at time of creation there is an error in the GPX format (18.7.2014)
		$('#data').val(e.name + ": " + e.message);
		return;
	}

}


// clears the map and the output of the data
function clearMap() {
	vector_layer.getSource().clear();
	if (select_interaction) {
		select_interaction.getFeatures().clear();
	}
	$('#data').val('');
}


// creates unique id's
function uid(){
	return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).slice(-4);
}

function addDragAndDropInteraction(map){
	map.removeInteraction(select_interaction);
	map.removeInteraction(modify_interaction);
	map.removeInteraction(draw_interaction);
	map.addInteraction(dragAndDropInteraction);
}

function setup( map) {
	//map.addControl(new DrawControl());
	//$(".draw-btn").tooltip({ placement: 'right', title: 'Waypoints, routes, and regions'});
	dragAndDropInteraction.on('addfeatures', function (event) {
		console.log(event);
		console.log(event.features);
		console.log(event.projection);
		var vectorSource = new ol.source.Vector({
			features: event.features,
			projection: event.projection
		});
		vector_layer.getSource().addFeatures(vectorSource.getFeatures());
		var view = map.getView();
		view.fitExtent(vector_layer.getExtent(), /** @type {ol.Size} */ (map.getSize()));
		var data = new ol.format.GeoJSON().writeFeaturesObject(vector_layer.getSource().getFeatures(), {
			featureProjection: 'EPSG:3857',
			dataProjection: 'EPSG:4326'
		});
		$('#data').val(JSON.stringify(data));
		//$("#saveFeaturePopupName").val(event.file.name);
		//$("#saveFeaturePopupPath").value=data.file.name;
		//dialogModal.show();

	});
	// Add to map
	map.addLayer(vector_layer);
	//map.addInteraction(dragAndDropInteraction);
	
	//draw handlers
	$("#drawPopupAction").on('change',function(e){
			toggleAction(map, e.target.value)
	});
	$("#drawPopupGeom").on('change',function(e){
		setGeomType(map, e.target.value);
	});
	
	// clear map when user clicks on 'Delete all features'
	//$("#delete").click(function() {
	//	clearMap();
	//});
}


$("#drawPopupSave").on('click', function() {
		saveData();
	});

module.exports = {
	clearMap,
	saveData,
	addDrawInteraction,
	addModifyInteraction,
	addDragAndDropInteraction,
	setup,
	setGeomType,
	toggleAction
}