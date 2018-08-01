var $ = require('jquery');
var ol = require('openlayers');

require('bootstrap-select');

var wsServer = require('./signalk.js');
var util = require('./util.js');

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
	var filter = $('#routeDrawerFilter').val();
	console.log("filtering with :"+filter);
	$('#routePopupList').empty();
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
			style: util.styleFunction
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
			
			//sort the keys in reverse
			var arr = [];

			for(var x in data){
			  arr.push({'key': x,'name': data[x].name});
			}
			//console.log("Array: "+JSON.stringify(arr));
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
					//console.log("Failed filter:"+filter);
					return;
				}
				$('#routePopupList').append('<li class="list-group-item" >'
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
		
			$('#routePopupList .featureDelete').on('click', function(){
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
			
			$('#routePopupList .featureRemove').on('click', function(){
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
			$('#routePopupList .featureAdd').on('click', function(){
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
								features: (new ol.format.GeoJSON()).readFeatures(data.feature,{ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })
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





$('#routeDrawerSearch').on('click', function(){
	refresh();
});


module.exports = {
	setup:setup,
	storeAddLayer:storeAddLayer,
	storeRemoveLayer:storeRemoveLayer
}