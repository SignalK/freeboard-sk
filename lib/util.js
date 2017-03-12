var ol = require('openlayers');

var image = new ol.style.Circle({
	radius: 5,
	fill: null,
	stroke: new ol.style.Stroke({ color: 'red', width: 1 })
  });

var styles = {
	'Point': new ol.style.Style({
	    image: new ol.style.Icon( ({
            src: 'img/marker-gold.png',
            scale: 1.5
        }))
	}),
	'LineString': new ol.style.Style({
	    stroke: new ol.style.Stroke({
	        color: 'green',
	        width: 1
	    })
	}),
	'MultiLineString': new ol.style.Style({
	    stroke: new ol.style.Stroke({
	        color: 'green',
	        width: 1
	    })
	}),
	'MultiPoint': new ol.style.Style({
	    image: image
	}),
	'MultiPolygon': new ol.style.Style({
	    stroke: new ol.style.Stroke({
	        color: 'yellow',
	        width: 1
	    }),
	    fill: new ol.style.Fill({
	        color: 'rgba(255, 255, 0, 0.1)'
	    })
	}),
	'Polygon': new ol.style.Style({
	    stroke: new ol.style.Stroke({
	        color: 'blue',
	        lineDash: [4],
	        width: 3
	    }),
	    fill: new ol.style.Fill({
	        color: 'rgba(0, 0, 255, 0.1)'
	    })
	}),
	'GeometryCollection': new ol.style.Style({
	    stroke: new ol.style.Stroke({
	        color: 'magenta',
	        width: 2
	    }),
	    fill: new ol.style.Fill({
	        color: 'magenta'
	    }),
	    image: new ol.style.Circle({
	        radius: 10,
	        fill: null,
	        stroke: new ol.style.Stroke({
	            color: 'magenta'
	        })
	    })
	}),
	'Circle': new ol.style.Style({
	    stroke: new ol.style.Stroke({
	        color: 'red',
	        width: 2
	    }),
	    fill: new ol.style.Fill({
	        color: 'rgba(255,0,0,0.2)'
	    })
	})
};

 var styleFunction = function (feature) {
	 
	  return styles[feature.getGeometry().getType()];
 };
function generateUUID(){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

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

function msToKnt(n) {
	return n * 1.94384;
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

//++++++++++++++++++++++++++++++++++++++++++++++
//Code below added for bearing and heading calculation, copyright as stated
/*
* ! JavaScript function to calculate the destination point given start point
* latitude / longitude (numeric degrees), bearing (numeric degrees) and
* distance (in m).
*
* Original scripts by Chris Veness Taken from
* http://movable-type.co.uk/scripts/latlong-vincenty-direct.html and optimized /
* cleaned up by Mathias Bynens <http://mathiasbynens.be/> Based on the Vincenty
* direct formula by T. Vincenty, Direct and Inverse Solutions of Geodesics on
* the Ellipsoid with application of nested equations, Survey Review, vol XXII
* no 176, 1975 <http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf>
*/
function destVincenty(lat1, lon1, brng, dist) {
	var a = 6378137, b = 6356752.3142, f = 1 / 298.257223563, // WGS-84
	// ellipsiod
	s = dist, alpha1 = brng, sinAlpha1 = Math.sin(alpha1), cosAlpha1 = Math
			.cos(alpha1), tanU1 = (1 - f) * Math.tan(toRad(lat1)), cosU1 = 1 / Math
			.sqrt((1 + tanU1 * tanU1)), sinU1 = tanU1 * cosU1, sigma1 = Math
			.atan2(tanU1, cosAlpha1), sinAlpha = cosU1 * sinAlpha1, cosSqAlpha = 1
			- sinAlpha * sinAlpha, uSq = cosSqAlpha * (a * a - b * b) / (b * b), A = 1
			+ uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq))), B = uSq
			/ 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq))), sigma = s
			/ (b * A), sigmaP = 2 * Math.PI;
	while (Math.abs(sigma - sigmaP) > 1e-12) {
		var cos2SigmaM = Math.cos(2 * sigma1 + sigma), sinSigma = Math
				.sin(sigma), cosSigma = Math.cos(sigma), deltaSigma = B
				* sinSigma
				* (cos2SigmaM + B
						/ 4
						* (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B
								/ 6 * cos2SigmaM
								* (-3 + 4 * sinSigma * sinSigma)
								* (-3 + 4 * cos2SigmaM * cos2SigmaM)));
		sigmaP = sigma;
		sigma = s / (b * A) + deltaSigma;
	}
	;

	var tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1, lat2 = Math
			.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1, (1 - f)
					* Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)), lambda = Math
			.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma
					* cosAlpha1), C = f / 16 * cosSqAlpha
			* (4 + f * (4 - 3 * cosSqAlpha)), La = lambda
			- (1 - C)
			* f
			* sinAlpha
			* (sigma + C
					* sinSigma
					* (cos2SigmaM + C * cosSigma
							* (-1 + 2 * cos2SigmaM * cos2SigmaM))), revAz = Math
			.atan2(sinAlpha, -tmp); // final bearing
	var llat = toDeg(lat2);
	var llon = lon1 + toDeg(La);
	return  [llon, llat];
};
		
module.exports={
	areaNm: areaNm,
	haversine: haversine,
	toRad: toRad,
	toDeg: toDeg,
	length: length,
	lengthNm: lengthNm,
	destVincenty:destVincenty,
	generateUUID:generateUUID,
	styleFunction:styleFunction,
	msToKnt: msToKnt 
}