var $ = require('jquery');
var ol = require('openlayers');
var styleFunction = require('./styleFunction.js');
var menuControl = require('./menuControl.js');
require('bootstrap-select');
// var setupDragAndDrop = require('./setupDragAndDrop.js');
var nanoModal= require('nanomodal');
var wsServer = require('./signalk.js');
var util = require('./util.js');
var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser({mergeAttrs: true, explicitArray:false});

var ChartControl = menuControl.makeDrawerButton('C','feature-btn','#chartDrawer');



function setup(map){
	$(".feature-btn").tooltip({ placement: 'right', title: 'Charts'});	
	map.addControl(new ChartControl());
	refresh();
	//loadFeatures(map);
}

function refresh(){
	var map = $('#map').data('map');
	var filter = $('#chartDrawerFilter').val();
	console.log("filtering with :"+filter);
	$('#chartPopupList').empty();
	//addFeatures(map, 'waypoints', filter);
	addCharts(map, 'charts', filter);
	//addFeatures(map, 'regions', filter);

}

function addCharts(map, chart, filter){
	$.ajax({
		url : "/signalk/v1/api/resources/"+chart,
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
				// console.log(chart +' '+JSON.stringify(obj));
				if(filter && filter.trim().length>0 && obj.name.indexOf(filter)<0){
					console.log("Failed filter:"+filter);
					return;
				}
				$('#chartPopupList').append('<li class="list-group-item" >'
					  +'<h4 class="list-group-item-heading"  >'+obj.name+'</h4>'
					  +'<div class="list-group-item-text">'+obj.description+'</div>'
					  +'<div>'
					  +'<a class="btn-primary btn-sm chartAdd" data-key="'+arrKey.key+'" data-name="'+obj.name+'"  data-type="'+chart+'" data-title="'+obj.name+'">Show</a>&nbsp;'
					  //+'<a class="btn-primary btn-sm chartEdit" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+chart+'">Edit</a>&nbsp;'
					 //+'<a class="btn-primary btn-sm chartSave" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+chart+'" >Save</a>&nbsp;'
					  +'<a class="btn-primary btn-sm chartRemove" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+chart+'">Hide</a>&nbsp;'
					  +'<a class="btn-primary btn-sm chartDelete" data-key="'+arrKey.key+'" data-name="'+obj.name+'" data-type="'+chart+'">Delete</a>'
					  +'</div>'
					  +'</li>');
			});
		
			$('.chartDelete').on('click', function(){
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
			
			$('.chartRemove').on('click', function(){
				var lyrs = map.getLayerGroup().getLayers();
				var key = $(this).attr('data-key');
				var l ;
				for (var x = 0; x < lyrs.getLength(); x++) {
					if (lyrs.item(x).get('key')=== key) {
						l = lyrs.item(x);
					}
				}
				
				console.log(map.removeLayer(l));
				//$(this).removeClass("btn-primary").addClass("btn-secondary");
			});

			/*$('.chartEdit').on('click', function(){
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

			/*$('.chartSave').on('click', function(){
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
			$('.chartAdd').on('click', function(){
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
					
					//storeAddLayer(url,title, key, type); 
					
					 $.ajax({
			            url: url,
			            dataType: "json",
			            success: function (data) {
			            	console.log("data:"+JSON.stringify(data));
			            	//now get the tilemapresource.xml
			            	var chartId = data.identifier;
			            	var chartUrl = '/mapcache/'+data.tilemapUrl+'/'+chartId+'/tilemapresource.xml';
			            	console.log("chartUrl:"+chartUrl);
			            	$.ajax({
					            url: chartUrl,
					            dataType: "text",
					            success: function (data) {
					            	console.log("data:"+data);
					            	//now magic, convert the xml to json
					            	xmlParser.parseString(data, function (err, result) {
					            	    console.log(JSON.stringify(result));
					            	    var tileSets = result.TileMap.TileSets.TileSet;
						            	var chartObj = new ol.layer.Tile({
						            		key: key,
						        			title: result.TileMap.Title,
						        			type: "overlay",
						        			maxResolution: parseFloat(tileSets[0]['units-per-pixel']),
						        			minResolution: parseFloat(tileSets[tileSets.length-1]['units-per-pixel']),
						        			source: new ol.source.XYZ({
						        				url: '/mapcache/'+chartId+'/{z}/{x}/{-y}.png',
						        				minZoom: parseInt(tileSets[0].href),
						        				maxZoom: parseInt(tileSets[tileSets.length-1].href)
						        			})
						        		});
	
										//console.log("chartObj complete: maxResolution:"+ parseFloat(tileSets[0]['units-per-pixel']));
										//console.log("chartObj complete: minResolution:"+ parseFloat(tileSets[tileSets.length-1]['units-per-pixel']));
										//console.log("chartObj complete: maxZoom:"+ parseInt(tileSets[0].href));
										//console.log("chartObj complete: minZoom:"+ parseInt(tileSets[tileSets.length-1].href));
										//fLayer.setExtent(layerSource.getExtent());
										map.addLayer(chartObj);
										console.log("Added");
					            	});
					            }});
			            }});
				 });
			

			}
	});
		

}





$('#chartDrawerSearch').on('click', function(){
	refresh();
});


module.exports = {
	ChartControl:ChartControl,
	setup:setup,
	
}