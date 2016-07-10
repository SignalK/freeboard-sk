var $ = require('jquery');
var ol = require('openlayers');
var styleFunction = require('./styleFunction.js');
var menuControl = require('./menuControl.js');
require('bootstrap-select');
// var setupDragAndDrop = require('./setupDragAndDrop.js');
var nanoModal= require('nanomodal');
var wsServer = require('./signalk.js');
var util = require('./util.js');

//var FeatureControl = menuControl.makeDrawerButton('C','feature-btn','#featureDrawer');

var modify_interaction, select_interaction;
function addModifyInteraction(map, layer, key) {
	// remove draw interaction
	console.log("Select Modify Interaction:"+key);
	map.removeInteraction(modify_interaction);
	map.removeInteraction(select_interaction);

	// create select interaction
	select_interaction = new ol.interaction.Select({
		// make sure only the desired layer can be selected
		layers: function(vect_layer) {
			return layer.get('key') === key;
		}
	});
	map.addInteraction(select_interaction);

	// grab the features from the select interaction to use in the modify
	// interaction
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
				// remove all selected features from select_interaction and
				// edit_layer
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
	// console.log("Add modify feature:"+selected_features.length);
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
	var description = layer.get('description');
	//document.querySelector('#drawPopupGeom :checked').value;
	var path = layer.get('type');
	var key = layer.get('key');
	if(key == null)key=util.generateUUID();
	//if(type === 'Point') path = 'resources.waypoints';
	//if(type === 'LineString') path = 'resources.routes';
	//if(type === 'Polygon') path = 'resources.regions';
	var putMsg = { context: 'resources',
				  put: [
					  {
						  timestamp: new Date().toISOString(),
						  source: 'resources'+window.ownVessel,
						  values: [
							  {
								  path: path+'.'+key,
								  value: {
									  name: name,
									  key: key,
									  description: description,
									  mimetype: 'application/vnd.geo+json',
									  feature: data
								  }
							  }

						  ]
					  }
				  ]

				 };

	console.log(JSON.stringify(putMsg));
	wsServer.send(JSON.stringify(putMsg)); 
}
function deleteData(key, type){
	
	var putMsg = { context: 'resources',
				  put: [
					  {
						 
						  values: [
							  {
								  path: type+'.'+key,
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
	//$(".feature-btn").tooltip({ placement: 'right', title: 'Waypoints, routes, regions'});	
	//map.addControl(new FeatureControl());
	refresh();
	//loadFeatures(map);
}

function refresh(){
	var map = $('#map').data('map');
	var filter = $('#featureDrawerFilter').val();
	console.log("filtering with :"+filter);
	$('#featurePopupList').empty();
	//addFeatures(map, 'waypoints', filter);
	addFeatures(map, 'routes', filter);
	//addFeatures(map, 'regions', filter);

}

function loadFeatures(map){
	var layers = [];
	//if(!localStorage.getItem('sk-load-layers')){
		localStorage.setItem('sk-load-layers',JSON.stringify(layers));	
	//}
	layers = JSON.parse(localStorage.getItem('sk-load-layers'))
	$.each(layers, function(i, obj) {
		var layerSource = new ol.source.Vector({
			url: obj.url,
			format: new ol.format.GeoJSON()
		});
		//featureProjection: 'EPSG:3857',
		//dataProjection: 'EPSG:4326'
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
	if(!layers)layers = [];
	var layer = {url:url,title:title,key: key, type: type,};
	layers.push(layer);
	localStorage.setItem('sk-load-layers',JSON.stringify(layers));	
}
function storeRemoveLayer(key){
	var layers = JSON.parse(localStorage.getItem('sk-load-layers'));
	if(!layers)return;
	layers = jQuery.grep(layers, function(value) {
		  return value.key != key;
		});
	localStorage.setItem('sk-load-layers',JSON.stringify(layers));	
}

function addFeatures(map, feature, filter){
	$.ajax({
		url : "/signalk/v1/api/resources/"+feature,
		dataType: "json", 
		success : function (data) {
			if(data==null)return;
			console.log("Data: "+data);
			//var jsonData = JSON.parse(data);
			//sort the keys in reverse
			var arr = [];

			for(var x in data){
			  arr.push({'key': x,'name': data[x].name});
			}
			console.log("Array: "+arr);
			arr.sort(function(a,b) 
			{
				if (a.name > b.name) {
				    return -1;
				  }
				  if (a.name < b.name) {
				    return 1;
				  }
				  return 0;
			});


			$.each(arr, function(r, arrKey) {
				var obj  = data[arrKey.key];
				// console.log(feature +' '+JSON.stringify(obj));
				if(filter && filter.trim().length>0 && obj.name.indexOf(filter)<0){
					console.log("Failed filter:"+filter);
					return;
				}
				$('#featurePopupList').append('<li class="list-group-item" >'
					  +'<h4 class="list-group-item-heading"  >'+obj.name+'</h4>'
					  +'<div class="list-group-item-text">'+obj.description+'</div>'
					  +'<div>'
					  +'<a class="btn-primary btn-sm featureAdd" data-key="'+arrKey.key+'" data-name="'+obj.name+'"  data-type="'+feature+'" data-title="'+obj.name+'">Show</a>&nbsp;'
					  //+'<a class="btn-primary btn-sm featureEdit" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+feature+'">Edit</a>&nbsp;'
					 //+'<a class="btn-primary btn-sm featureSave" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+feature+'" >Save</a>&nbsp;'
					  +'<a class="btn-primary btn-sm featureRemove" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+feature+'">Hide</a>&nbsp;'
					  +'<a class="btn-primary btn-sm featureDelete" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+feature+'">Delete</a>'
					  +'</div>'
					  +'</li>');
			});
		
			$('.featureDelete').on('click', function(){
				//alert(Are you sure?);
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var type = $(this).attr('data-type');
				var l ;
				console.log("Find layer:"+key+", type:"+type);
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
					}
				}
				if(l){
					console.log("Found layer:"+l);
					storeRemoveLayer(key);
					map.removeLayer(l)
					console.log("Removed layer:"+l);
				}
				// now delete from server
				deleteData(key,type);
				refresh();
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
				//$(this).removeClass("btn-primary").addClass("btn-secondary");
			});

			/*$('.featureEdit').on('click', function(){
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var l ;
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
						addModifyInteraction(map, l, key);
					}
				}

			});*/

			/*$('.featureSave').on('click', function(){
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var l ;
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
						saveData(l);
					}
				}

			});*/
			$('.featureAdd').on('click', function(){
					// check it not already there
					var lyrs = map.getLayers().getArray().slice().reverse();
					var title = $(this).attr('data-name');
					var key = $(this).attr('data-key');
					var type = $(this).attr('data-type');
					
					for (var x = 0; x < lyrs.length; x++) { 
						if(lyrs[x].get('key')=== key) {  
							return; 
						} 
					}
					 
					// add new layer
					
					
					var url = "/signalk/v1/api/resources/"+type+"/"+key;
					
					storeAddLayer(url,title, key, type); 
					//var testGeo = '{"feature":[{"type":"Feature","id":"fbv4","geometry":{"type":"Polygon","coordinates":[[[-122.46236801147461,37.8323275231033],[-122.42537498474121,37.82168374803001],[-122.45962142944336,37.81056377038564],[-122.46236801147461,37.8323275231033]]]}';
					// get the geojson
					 $.ajax({
			            url: url,
			            dataType: "json",
			            success: function (data) {
			            	console.log("data:"+JSON.stringify(data));
			            	
							var layerSource = new ol.source.Vector({
								features: (new ol.format.GeoJSON()).readFeatures(data.feature[0],{ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })
							});
							
							console.log("layerSource complete");
							var fLayer = new ol.layer.Vector({
								key: key,
								type: type,
								title: title,
								source: layerSource,
								style: util.styleFunction
							});
							console.log("fLayer complete");
							fLayer.setExtent(layerSource.getExtent());
							map.addLayer(fLayer);
							console.log("Added");
			            }});
				 });
			

			}
	});
		

}





$('#featureDrawerSearch').on('click', function(){
	refresh();
});


module.exports = {
	setup:setup,
	saveData:saveData,
	storeAddLayer:storeAddLayer,
	storeRemoveLayer:storeRemoveLayer
}