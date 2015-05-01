var $ = require('jquery');
var ol = require('openlayers');
var styleFunction = require('./styleFunction.js');
//var setupDragAndDrop = require('./setupDragAndDrop.js');


//draw edit features
// create a vector layer used for editing
var vector_layer = new ol.layer.Vector({
	name: 'edit_vector_layer',
	source: new ol.source.Vector(),
	style: styleFunction
});

var geomType = 'Point';
function getGeomType(){
	return geomType;
}
function setGeomType(type){
	geomType = type;
}
// make interactions global so they can later be removed
var select_interaction,
	draw_interaction,
	modify_interaction;
//need these global
var map, connection;
var dragAndDropInteraction;


// build up modify interaction
// needs a select and a modify interaction working together
function addModifyInteraction() {
	// remove draw interaction
	console.log("Select Modify Interaction:"+geomType);
	this.map.removeInteraction(draw_interaction);
	this.map.removeInteraction(modify_interaction);
	this.map.removeInteraction(select_interaction);
	if(dragAndDropInteraction) this.map.removeInteraction(dragAndDropInteraction);
	// create select interaction
	select_interaction = new ol.interaction.Select({
		// make sure only the desired layer can be selected
		layers: function(vector_layer) {
			return vector_layer.get('name') === 'edit_vector_layer';
		}
	});
	this.map.addInteraction(select_interaction);

	// grab the features from the select interaction to use in the modify interaction
	var selected_features = select_interaction.getFeatures();
	// when a feature is selected...
	selected_features.on('add', function(event) {
		// grab the feature
		var feature = event.element;
		console.log("Selected feature:"+feature.getId());
		// ...listen for changes and save them
		feature.on('change', saveData);
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
							saveData();
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
	this.map.addInteraction(modify_interaction);
	console.log("Added modify feature");
}

// creates a draw interaction
function addDrawInteraction() {
	// remove other interactions
	console.log("Select Draw Interaction:"+geomType);
	if(dragAndDropInteraction)this.map.removeInteraction(dragAndDropInteraction);
	this.map.removeInteraction(select_interaction);
	this.map.removeInteraction(modify_interaction);
	this.map.removeInteraction(draw_interaction);
	// create the interaction
	draw_interaction = new ol.interaction.Draw({
		source: vector_layer.getSource(),
		type: /** @type {ol.geom.GeometryType} */ geomType
	});
	// add it to the map
	this.map.addInteraction(draw_interaction);

	// when a new feature has been drawn...
	draw_interaction.on('drawend', function(event) {
		// create a unique id
		// it is later needed to delete features
		var id = uid();
		// give the feature this id
		event.feature.setId(id);
		// save the changed data
		saveData(); 
	});
}

// add the draw interaction when the page is first shown
//addDrawInteraction();

// shows data in textarea
// replace this function by what you need
function saveData(connection) {
	// get the format the user has chosen
	try {
		var data = new ol.format.GeoJSON().writeFeaturesObject(vector_layer.getSource().getFeatures(), {
			featureProjection: 'EPSG:900913',
			dataProjection: 'EPSG:4326'
		});

		$('#data').val(JSON.stringify(data, null, 4));

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

function addDragAndDropInteraction(){
	this.map.addInteraction(dragAndDropInteraction);	
}

function setup(connection, map) {
	this.map=map;
	this.connection=connection;

	// Add to map
	//dragAndDropInteraction = setupDragAndDrop(connection, map);
	map.addLayer(vector_layer);
	//map.addInteraction(dragAndDropInteraction);
}


module.exports = {
	clearMap,
	saveData,
	addDrawInteraction,
	addModifyInteraction,
	addDragAndDropInteraction,
	setup,
	setGeomType,
	getGeomType
}