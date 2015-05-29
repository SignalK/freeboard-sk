var $ = require('jquery');
var ol = require('openlayers');
var styleFunction = require('./styleFunction.js');
var menuControl = require('./menuControl.js');
require('bootstrap-select');
//var setupDragAndDrop = require('./setupDragAndDrop.js');
var nanoModal= require('nanomodal');
var wsServer = require('./signalk.js');


var FeatureControl = menuControl.makeDrawerButton('C','feature-btn','#featureDrawer');

var modify_interaction, select_interaction;
function addModifyInteraction(map, layer, title) {
	// remove draw interaction
	console.log("Select Modify Interaction:"+title);
	map.removeInteraction(modify_interaction);
	map.removeInteraction(select_interaction);

	// create select interaction
	select_interaction = new ol.interaction.Select({
		// make sure only the desired layer can be selected
		layers: function(vect_layer) {
			return layer.get('title') === title;
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
				// remove all selected features from select_interaction and edit_layer
				selected_features.forEach(function(selected_feature) {
					var selected_feature_id = selected_feature.getId();
					// remove from select_interaction
					selected_features.remove(selected_feature);
					// features aus vectorlayer entfernen
					var vectorlayer_features = layer.getSource().getFeatures();
					vectorlayer_features.forEach(function(source_feature) {
						var source_feature_id = source_feature.getId();
						if (source_feature_id === selected_feature_id) {
							// remove from edit_layer
							layer.getSource().removeFeature(source_feature);

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
	map.addInteraction(modify_interaction)
	console.log("Added modify feature");
}

function saveData(layer){
	var data = new ol.format.GeoJSON().writeFeaturesObject(layer.getSource().getFeatures(), {
		featureProjection: 'EPSG:3857',
		dataProjection: 'EPSG:4326'
	});
	var name = layer.get('title');
	//var desc = document.querySelector("#saveFeaturePopupDesc").value;
	//var type = document.querySelector('#drawPopupGeom :checked').value;
	var path = layer.get('type');
	var key = layer.get('key');
	if(key == null)key=name;
	//if(type === 'Point') path = 'waypoints';
	//if(type === 'LineString') path = 'resources.routes';
	//if(type === 'Polygon') path = 'resources.regions';
	var putMsg = { context: 'vessels.self',
				  put: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'vessels.self',
						  values: [
							  {
								  path: 'resources.'+path+'.'+key,
								  value: {
									  name: name,
									  key: key,
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
}
function deleteData(layer){
	
	var name = layer.get('title');
	
	var path = layer.get('type');
	var key = layer.get('key');
	if(key == null)key=name;
	
	var putMsg = { context: 'vessels.self',
				  put: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'vessels.self',
						  values: [
							  {
								  path: 'resources.'+path+'.'+key,
								  value: null
							  }

						  ]
					  }
				  ]

				 };

	console.log(JSON.stringify(putMsg));
	wsServer.send(JSON.stringify(putMsg)); 
}

function setup(map){
	$(".feature-btn").tooltip({ placement: 'right', title: 'Waypoints, routes, regions'});	
	map.addControl(new FeatureControl());
	refresh();
	loadFeatures(map);
}

function refresh(){
	var map = $('#map').data('map');
	var filter = $('#featureDrawerFilter').val();
	console.log("filtering with :"+filter);
	$('#featurePopupList').empty();
	addFeatures(map, 'waypoints', filter);
	addFeatures(map, 'routes', filter);
	addFeatures(map, 'regions', filter);

}

function loadFeatures(map){
	var layers = [];
	if(!localStorage.getItem('sk-load-layers')){
		localStorage.setItem('sk-load-layers',JSON.stringify(layers));	
	}
	layers = JSON.parse(localStorage.getItem('sk-load-layers'))
	$.each(layers, function(i, obj) {
		var layerSource = new ol.source.Vector({
			url: obj.url,
			format: new ol.format.GeoJSON()
		});
		map.addLayer(new ol.layer.Vector({
			title: obj.title,
			key: obj.key,
			type: obj.type,
			source: layerSource,
			style: styleFunction
		}));
	});
}

function storeAddLayer(url,title, key, type){
	var layers = JSON.parse(localStorage.getItem('sk-load-layers'));
	var layer = {url:url,title:title,key: key, type: type,};
	layers.push(layer);
	localStorage.setItem('sk-load-layers',JSON.stringify(layers));	
}
function storeRemoveLayer(key){
	var layers = JSON.parse(localStorage.getItem('sk-load-layers'));
	layers = jQuery.grep(layers, function(value) {
		  return value.key != key;
		});
	localStorage.setItem('sk-load-layers',JSON.stringify(layers));	
}

function addFeatures(map, feature, filter){
	$.ajax({
		url : "/signalk/api/v1/vessels/self/resources/"+feature,
		dataType: "text",
		success : function (data) {
			if(data==null)return;
			var jsonData = JSON.parse(data);
			$.each(jsonData.vessels, function(i, obj) {
				console.log("Vessel: "+i);
				$.each(obj.resources[feature], function(r, obj) {
					console.log(feature +' '+r);
					if(filter && filter.trim().length>0 && obj.name.indexOf(filter)<0){
						console.log("Failed filter:"+filter);
						return;
					}
					$('#featurePopupList').append('<li class="list-group-item" >'
												  +'<h4 class="list-group-item-heading"  >'+obj.name+'</h4>'
												  +'<div class="list-group-item-text">'+obj.description+'</div>'
												  +'<div>'
												  +'<a class="btn-primary btn-sm featureAdd" data-key="'+r+'"  data-type="'+feature+'" data-uri="'+obj.uri+'" data-title="'+obj.name+'">Show</a>&nbsp;'
												  +'<a class="btn-primary btn-sm featureEdit" data-key="'+r+'">Edit</a>&nbsp;'
												  +'<a class="btn-primary btn-sm featureSave" data-key="'+r+'" data-type="'+feature+'" data-uri="'+obj.uri+'" >Save</a>&nbsp;'
												  +'<a class="btn-primary btn-sm featureRemove" data-key="'+r+'">Hide</a>&nbsp;'
												  +'<a class="btn-primary btn-sm featureDelete" data-key="'+r+'">Delete</a>'
												  +'</div>'
												  +'</li>');
				});
			});
			$('.featureDelete').on('click', function(){
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var l ;
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
					}
				}
				storeRemoveLayer(key);
				console.log(map.removeLayer(l));
				//now delete from server
				deleteData(l);
			});
			
			$('.featureRemove').on('click', function(){
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var l ;
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
					}
				}
				storeRemoveLayer(key);
				console.log(map.removeLayer(l));
			});

			$('.featureEdit').on('click', function(){
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var l ;
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
						addModifyInteraction(map, l, key);
					}
				}

			});

			$('.featureSave').on('click', function(){
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var l ;
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
						saveData(l);
					}
				}

			});

			$('.featureAdd').on('click', function(){
				//check it not already there
				var lyrs = map.getLayers().getArray().slice().reverse();
				var title = $(this).attr('data-name');
				var key = $(this).attr('data-key');
				for (var x = 0; x < lyrs.length; x++) {
					if (lyrs[x].get('key')=== key) {
						//zoom to extent
						map.getView().fitExtent(lyrs[x].getSource().getExtent(), map.getSize());
						return;
					}
				}
				//add new layer
				
				var url = "/signalk/api/v1/resources/"+$(this).attr('data-uri');
				var type = $(this).attr('data-type');
				storeAddLayer(url,title, key, type);
				var layerSource = new ol.source.Vector({
					url: url,
					format: new ol.format.GeoJSON()
				});
				map.addLayer(new ol.layer.Vector({
					title: title,
					key: key,
					type: type,
					source: layerSource,
					style: styleFunction
				}));
				setTimeout(function(){
					map.getView().fitExtent(layerSource.getExtent(), map.getSize());
				},250);

			});
		}});

}

$('#featureDrawerSearch').on('click', function(){
	refresh();
});


module.exports = {
	FeatureControl:FeatureControl,
	setup:setup,
	saveData:saveData,
	storeAddLayer:storeAddLayer,
	storeRemoveLayer:storeRemoveLayer
}