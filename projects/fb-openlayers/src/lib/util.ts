import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { getPointResolution, fromLonLat } from 'ol/proj';

import { Coordinate } from './models';
import { Options } from 'ol/layer/BaseTile';

export function stringToEl(html: string) {
  const parser = new DOMParser();
  const DOM = parser.parseFromString(html, 'text/html');
  return DOM.body.firstChild;
}

export function defaultLayers() {
  return [
    osmLayer()
  ];
}

export function osmLayer() {
  return new TileLayer({source: new OSM()});
}

export function osmSource() {
  return new OSM();
}

export function fromLonLatArray(coords:Coordinate)  // Point
export function fromLonLatArray(coords:Array<Coordinate>)  //LineString
export function fromLonLatArray(coords:Array<Array<Coordinate>>)  // MultiLineString
export function fromLonLatArray(coords: Array<any>) {
  if( !Array.isArray(coords) ) { return coords }
  if(typeof coords[0]=='number') {
      return fromLonLat(coords);
  }
  else if(Array.isArray(coords[0]) ) { 
      return coords.map( c=> { return fromLonLatArray(c) });
  }
  else { return coords }
}

/** DateLine Crossing:
 * returns true if point is in the zone for dateline transition 
 * zoneValue: lower end of 180 to xx range within which Longitude must fall for retun value to be true
**/
export function inDLCrossingZone(coord:Coordinate, zoneValue:number= 170) {
  return (Math.abs(coord[0])>=zoneValue) ? true : false;
}

// update linestring coords for map display (including dateline crossing)
export function mapifyCoords(coords:Array<Coordinate>):Array<Coordinate> {
  if(coords.length==0) { return coords }
  let dlCrossing= 0;
  let last= coords[0];
  for(let i=0; i< coords.length; i++) {         
      if( inDLCrossingZone(coords[i]) || inDLCrossingZone(last) ) {
          dlCrossing= (last[0]>0 && coords[i][0]<0) ? 1 
              : (last[0]<0 && coords[i][0]>0) ? -1 : 0;
          if(dlCrossing==1) { coords[i][0]= coords[i][0] + 360}
          if(dlCrossing==-1) { coords[i][0]= Math.abs(coords[i][0])-360 }
      } 
  }
  return coords;
}   

// ** return adjusted radius to correctly render circle on ground at given position.
export function mapifyRadius(radius:number, position:Coordinate): number {
    if(typeof radius=== 'undefined' || typeof position=== 'undefined') { return radius }
    return radius / getPointResolution('EPSG:3857', 1, fromLonLat(position));
}

/*
* Calculate the destination point given start point
* latitude / longitude (numeric degrees), bearing (radians) and
* distance (in m).
*
* Original scripts by Chris Veness Taken from
* http://movable-type.co.uk/scripts/latlong-vincenty-direct.html and optimized /
* cleaned up by Mathias Bynens <http://mathiasbynens.be/> Based on the Vincenty
* direct formula by T. Vincenty, Direct and Inverse Solutions of Geodesics on
* the Ellipsoid with application of nested equations, Survey Review, vol XXII
* no 176, 1975 <http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf> */
export function  destCoordinate(coord:Coordinate, brng:number, dist:number): Coordinate {
    let lat1:number= coord[1];
    let lon1:number= coord[0];
    let a = 6378137, b = 6356752.3142, f = 1 / 298.257223563, // WGS-84
    // ellipsiod
    s = dist, alpha1 = brng, sinAlpha1 = Math.sin(alpha1), cosAlpha1 = Math
            .cos(alpha1), tanU1 = (1 - f) * Math.tan(lat1 * (Math.PI/180)), cosU1 = 1 / Math
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

    let tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1, lat2 = Math
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
    let llat = lat2 * (180/Math.PI);
    let llon = lon1 + La * (180/Math.PI);
    return  [llon, llat];
}
