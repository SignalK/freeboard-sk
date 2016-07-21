var $ = require('jquery');
window.$ = window.jQuery = require('jquery');
require('bootstrap');
require('bootstrap-drawer');
require('bootstrap-slider');
require('bootstrap-toggle');
var layerSwitcher = require('./lib/ol3-layerswitcher.js');

var ol = require('openlayers');
var addBaseLayers = require('./lib/addBaseLayers.js');
//var addChartLayers = require('./lib/addLayers.js');
var drawFeatures = require('./lib/drawFeatures.js');
var routes = require('./lib/routes.js');
var waypoints = require('./lib/waypoints.js');
var charts = require('./lib/charts.js');
var aisVessels = require('./lib/aisVessels.js');
//var displayFeatureInfo = require('./lib/displayFeatureInfo.js');
var vesselPosition = require('./lib/vesselPosition.js');
var menuControl = require('./lib/menuControl.js');
var anchor = require('./lib/anchorControl.js');

window.wsServer = require('./lib/signalk.js');
var simplify = require('./lib/simplify-js.js');

var measure = require('./lib/measure.js');
var view = new ol.View({
    center: ol.proj.transform([65, 50], 'EPSG:4326', 'EPSG:3857'),
    zoom: 3
})
//var settings = JSON.parse(localStorage.getItem("settings"));
//localStorage.setItem("settings", JSON.stringify(data));

var mousePositionControl = new ol.control.MousePosition({
    coordinateFormat: ol.coordinate.createStringXY(4),
    projection: 'EPSG:4326',
    undefinedHTML: '&nbsp;'
});

var map = new ol.Map({
    interactions: ol.interaction.defaults().extend([new ol.interaction.DragRotateAndZoom()]),
    target: 'map',
    layers: [],
    view: view,
    controls: ol.control.defaults({
        attributionOptions: {
            collapsible: true
        }
    }).extend([mousePositionControl])
});

//make map global
$('#map').data('map', map);
//use 'var map = $('#map').data('map');' to get it back

//reset any existing settings
if (localStorage.getItem("sk-zoom")) {
    map.getView().setZoom(localStorage.getItem("sk-zoom"));
}
if (localStorage.getItem("sk-center")) {
    map.getView().setCenter(JSON.parse(localStorage.getItem("sk-center")));
}
if (localStorage.getItem("sk-rotation")) {
    map.getView().setRotation(localStorage.getItem("sk-rotation"));
}

//store location and zoom, etc
map.getView().on('change:resolution', function (evt) {
    localStorage.setItem("sk-zoom", map.getView().getZoom());
});
map.getView().on('change:center', function (evt) {
    localStorage.setItem("sk-center", JSON.stringify(map.getView().getCenter()));
});
map.getView().on('change:rotation', function (evt) {
    localStorage.setItem("sk-rotation", map.getView().getRotation());
});

//add our layers
addBaseLayers(map);

map.addControl(layerSwitcher);


var rkScaleLine = new ol.control.ScaleLine({
    className: 'ol-scale-line',
    units: 'nautical'});
map.addControl(rkScaleLine);

function dispatch(delta) {
    //do nothing
}

function connect() {
	var sub = '{"context":"vessels.self","unsubscribe":[{"path":"*","policy":"instant"}]}';
    window.wsServer.send(sub);
    aisVessels.setup(map);
    vesselPosition.setup(map);
    drawFeatures.setup( map);
    anchor.setup(map);
    menuControl.setup(map);
    measure.setup(map);
    routes.setup(map);
    charts.setup(map);
    waypoints.setup(map);

}


var element = document.getElementById('mapPopup');

var popup = new ol.Overlay({
  element: element,
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -10]
});

$(element).popover({
    'placement': 'top',
    'html': true
  });

map.addOverlay(popup);

// display popup on click
map.on('click', function(evt) {
  
  var feature = map.forEachFeatureAtPixel(evt.pixel,
      function(feature) {
        return feature;
      });
  if (feature) {
    var coordinates = feature.getGeometry().getCoordinates();
    popup.setPosition(coordinates);
    var context, name, vhf, port, flag, mmsi ;
    context= name= vhf=port=flag=mmsi = '?';
    if(feature.get('context'))context=feature.get('context');
    if(feature.get('name'))name=feature.get('name').replace(/@/g,"");
    if(feature.get('vhf'))vhf=feature.get('vhf');
    if(feature.get('port'))port=feature.get('port');
    if(feature.get('flag'))flag=feature.get('flag');
    $(element).attr('data-content', '<p>'+context+'<br/> Name:'+name+'<br/> Vhf:'+vhf+'<br/> Port:'+port+', Flag:'+flag+'</p>');
    $(element).popover('show'); 
  } else {
    $(element).popover('hide');
  } 
});



$.ajax({
    url: "/signalk",
    dataType: "json",
    success: function (data) {
        console.log(data);
        var url = data.endpoints.v1['signalk-http'];
        console.log(url);
        $.ajax({
            url: url + 'vessels/self',
            dataType: "json",
            success: function (data) {
                //var jsonData = JSON.parse(data);
                console.log(JSON.stringify(data));
                //TODO: find  uuid or mmsi or ?
                if(data.uuid){
                	ownVessel = data.uuid;
                }
                if(!ownVessel && data.mmsi){
                	ownVessel = data.mmsi;
                }
                if(!ownVessel && data.url){
                	ownVessel = data.url;
                }
                console.log(ownVessel);

            }
        });
    }
});
$.ajax({
    url: "/signalk",
    dataType: "json",
    success: function (data) {
        //var jsonData = JSON.parse(data);
        console.log(data);
        var url = data.endpoints.v1['signalk-ws'];
        console.log(url);
        var host = url.substring(url.indexOf("//")+2);
        host = host.substring(0,host.indexOf("/"));

        window.wsServer.connectDelta(host, dispatch, connect);
    }
});
