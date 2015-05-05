var ol = require('openlayers');
var styleFunction = require('./styleFunction.js');
var nanoModal= require('nanomodal');
var dragAndDropInteraction = new ol.interaction.DragAndDrop({
	formatConstructors: [ol.format.GPX, ol.format.GeoJSON, ol.format.IGC, ol.format.KML, ol.format.TopoJSON]
});
module.exports = function (connection, map) {
	dragAndDropInteraction.on('addfeatures', function (event) {
		console.log(event);
		var vectorSource = new ol.source.Vector({
			features: event.features,
			projection: event.projection
		});
		map.getLayers().push(new ol.layer.Vector({
			name: 'drag_drop_vector_layer',
			source: vectorSource,
			style: styleFunction
		}));
		var view = map.getView();
		view.fitExtent(vectorSource.getExtent(), /** @type {ol.Size} */ (map.getSize()));
		var data = new ol.format.GeoJSON().writeFeaturesObject(vectorSource.getFeatures(), {
				featureProjection: 'EPSG:900913',
				dataProjection: 'EPSG:4326'
			});
		
		var dialogModal = nanoModal(document.querySelector("#saveFeaturePopup"), {
			overlayClose: false, // Can't close the modal by clicking on the overlay. 
			buttons: [{
				text: "Save",
				handler: function(modal) {
					var name = document.querySelector("#saveFeaturePopupName").value;
					var desc = document.querySelector("#saveFeaturePopupDesc").value;
					var path = document.querySelector("#saveFeaturePopupPath").value;
					var putMsg = { context: 'resources.self',
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
					connection.send(JSON.stringify(putMsg)); 
					
					modal.hide();
				},
				primary: true
			}, {
				text: "Cancel",
				handler: "hide"
			}]
		});
		document.querySelector("#saveFeaturePopupName").value=event.file.name;
		//document.querySelector("#saveFeaturePopupPath").value=data.file.name;
		dialogModal.show();
		
		
	});
	return dragAndDropInteraction;
}