var ol = require('openlayers');
var $ = require('jquery');
var util = require('./util.js');
var source = new ol.source.Vector();
var menuControl = require('./menuControl.js');

var vector = new ol.layer.Vector({
	title: "Measure",
	source: source,
	style: new ol.style.Style({
		fill: new ol.style.Fill({
			color: 'rgba(255, 255, 255, 0.2)'
		}),
		stroke: new ol.style.Stroke({
			color: '#ffcc33',
			width: 2
		}),
		image: new ol.style.Circle({
			radius: 7,
			fill: new ol.style.Fill({
				color: '#ffcc33'
			})
		})
	})
});

vector.on('change:visible',function(evt){
	if(vector.getVisible()){
		$('.tooltip-measure-static').css('visibility', 'visible');
	}else{
		$('.tooltip-measure-static').css('visibility', 'hidden');
	}
});
/**
 * Currently drawn feature.
 * @type {ol.Feature}
 */
var sketch;


/**
 * The help tooltip element.
 * @type {Element}
 */
var helpTooltipElement;


/**
 * Overlay to show the help messages.
 * @type {ol.Overlay}
 */
var helpTooltip;


/**
 * The measure tooltip element.
 * @type {Element}
 */
var measureTooltipElement;


/**
 * Overlay to show the measurement.
 * @type {ol.Overlay}
 */
var measureTooltip;


/**
 * Message to show when the user is drawing a polygon.
 * @type {string}
 */
var continuePolygonMsg = 'Click to continue drawing the polygon';


/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */
var continueLineMsg = 'Click to continue drawing the line';


/**
 * Handle pointer move.
 * @param {ol.MapBrowserEvent} evt
 */
var pointerMoveHandler = function(evt) {
	if(!measureOn)return;
	if (evt.dragging) {
		return;
	}
	/** @type {string} */
	var helpMsg = 'Click to start drawing';
	/** @type {ol.Coordinate|undefined} */
	var tooltipCoord = evt.coordinate;

	if (sketch) {
		var output;
		var geom = (sketch.getGeometry());
		if (geom instanceof ol.geom.Polygon) {
			output = formatArea(/** @type {ol.geom.Polygon} */ (geom));
			helpMsg = continuePolygonMsg;
			tooltipCoord = geom.getInteriorPoint().getCoordinates();
		} else if (geom instanceof ol.geom.LineString) {
			output = formatLength( /** @type {ol.geom.LineString} */ (geom));
			helpMsg = continueLineMsg;
			tooltipCoord = geom.getLastCoordinate();
		}
		measureTooltipElement.innerHTML = output;
		measureTooltip.setPosition(tooltipCoord);
	}

	helpTooltipElement.innerHTML = helpMsg;
	helpTooltip.setPosition(evt.coordinate);
};

function setup(map){
	map.addLayer(vector);
	createInteraction(map);
	
	var MeasureControl = menuControl.makeButton('V','measure-btn', function (e) {
		toggleMeasure(map);
	});
	map.addControl(new MeasureControl());
	$(".measure-btn").tooltip({ placement: 'right', title: 'Toggle measure'});
}

var measureOn = false;
function toggleMeasure(map){
	measureOn=!measureOn;
	if(measureOn){
		map.addInteraction(draw);
		createHelpTooltip(map);
		createMeasureTooltip(map);
		map.on('pointermove', pointerMoveHandler);
	}else{
		map.removeInteraction(draw);
		map.removeOverlay(helpTooltip);
	}
	
}
//var typeSelect = document.getElementById('type');
//var geodesicCheckbox = document.getElementById('geodesic');

var draw; // global so we can remove it later
function createInteraction(map) {
	
	//var type = (typeSelect.value == 'area' ? 'Polygon' : 'LineString');
	draw = new ol.interaction.Draw({
		source: source,
		type: /** @type {ol.geom.GeometryType} */ 'LineString',
		style: new ol.style.Style({
			fill: new ol.style.Fill({
				color: 'rgba(255, 255, 255, 0.2)'
			}),
			stroke: new ol.style.Stroke({
				color: 'rgba(0, 0, 0, 0.5)',
				lineDash: [10, 10],
				width: 2
			}),
			image: new ol.style.Circle({
				radius: 5,
				stroke: new ol.style.Stroke({
					color: 'rgba(0, 0, 0, 0.7)'
				}),
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.2)'
				})
			})
		})
	});
	
	draw.on('drawstart',
			function(evt) {
		// set sketch
		sketch = evt.feature;
	}, this);

	draw.on('drawend',
			function(evt) {
		measureTooltipElement.className = 'tooltip tooltip-measure-static';
		measureTooltip.setOffset([0, -7]);
		// unset sketch
		sketch = null;
		// unset tooltip so that a new one can be created
		measureTooltipElement = null;
		createMeasureTooltip(map);
	}, this);
	
}


/**
 * Creates a new help tooltip
 */
function createHelpTooltip(map) {
	if (helpTooltipElement) {
		helpTooltipElement.parentNode.removeChild(helpTooltipElement);
	}
	helpTooltipElement = document.createElement('div');
	helpTooltipElement.className = 'tooltip tooltip-help';
	helpTooltip = new ol.Overlay({
		element: helpTooltipElement,
		offset: [15, 0],
		positioning: 'center-left'
	});
	map.addOverlay(helpTooltip);
}


/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip(map) {
	if (measureTooltipElement) {
		measureTooltipElement.parentNode.removeChild(measureTooltipElement);
	}
	measureTooltipElement = document.createElement('div');
	measureTooltipElement.className = 'tooltip tooltip-measure';
	measureTooltip = new ol.Overlay({
		element: measureTooltipElement,
		offset: [0, -15],
		positioning: 'bottom-center'
	});
	map.addOverlay(measureTooltip);
}


/**
 * Let user change the geometry type.
 * @param {Event} e Change event.
 */
//typeSelect.onchange = function(e) {
// map.removeInteraction(draw);
// addInteraction();
//};


/**
 * format length output
 * @param {ol.geom.LineString} line
 * @return {string}
 */
var formatLength = function(line) {
	var output = util.lengthNm(line)+' Nm';
	return output;
};


/**
 * format length output
 * @param {ol.geom.Polygon} polygon
 * @return {string}
 */
var formatArea = function(polygon) {
		return util.areaNm(polygon) + ' Nm<sup>2</sup>';
};

//addInteraction();
module.exports={
	setup: setup,
	createInteraction: createInteraction
}
