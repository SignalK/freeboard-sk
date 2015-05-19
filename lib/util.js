var ol = require('openlayers');

function lengthNm(line) {
	return +(length(line)/1852).toFixed(2);
};
					  
function length(line) {
	//meters?
	var coordinates = line.getCoordinates();
	var length = 0;
	  for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
		var c1 = ol.proj.transform(coordinates[i], 'EPSG:3857', 'EPSG:4326');
		var c2 = ol.proj.transform(coordinates[i + 1], 'EPSG:3857', 'EPSG:4326');
		length += haversine(c1, c2);
	  }
	return +length.toFixed(2);
	
};

function toRad(n) {
	return n * Math.PI / 180;
};
function toDeg(n) {
	return n * 180 / Math.PI;
};

function haversine(c1, c2) {
	var lat1 = toRad(c1[1]);
	var lat2 = toRad(c2[1]);
	var deltaLatBy2 = (lat2 - lat1) /2;
	var deltaLonBy2 = toRad(c2[0] - c1[0])/2;
	var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
		Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) *
		Math.cos(lat1) * Math.cos(lat2);
	return 2 * 6378137 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * format length output
 * @param {ol.geom.Polygon} polygon
 * @return {string}
 */
function areaNm(polygon) {
	var area = polygon.getArea();
	return +(area / 34299.04 ).toFixed(2);
	
};
		
module.exports={
	areaNm: areaNm,
	haversine: haversine,
	toRad: toRad,
	toDeg: toDeg,
	length: length,
	lengthNm: lengthNm
}