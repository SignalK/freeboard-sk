/*******************************
    GeoUtils Class Module       
*******************************/
import { getPointResolution, fromLonLat } from 'ol/proj';
import { Convert } from './convert';

export type Extent = [number,number,number,number]; // coords [swlon,swlat,nelon,nelat] of a bounding box

export type Position = [number, number, number?]; // [lon,lat, alt]

export class GeoUtils {

    constructor() {}

    //++++++++++++++++++++++++++++++++++++++++++++++
    //Code below added for bearing and heading calculation, copyright as stated
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
    static destCoordinate(lat1, lon1, brng, dist): Position {
        let a = 6378137, b = 6356752.3142, f = 1 / 298.257223563, // WGS-84
        // ellipsiod
        s = dist, alpha1 = brng, sinAlpha1 = Math.sin(alpha1), cosAlpha1 = Math
                .cos(alpha1), tanU1 = (1 - f) * Math.tan(Convert.degreesToRadians(lat1)), cosU1 = 1 / Math
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
        let llat = Convert.radiansToDegrees(lat2);
        let llon = lon1 + Convert.radiansToDegrees(La);
        return  [llon, llat];
    }

    //** Return the distance and bearing from source to destination
    static toGo(srcpt:Position, destpt:Position) {
        let brg= GeoUtils.bearingTo(srcpt, destpt);
        let dst= GeoUtils.distanceTo(srcpt, destpt);
        return { bearing: brg, distance: dst }
    }

    //** Calculate the great circle distance between two points in metres
    static distanceTo(srcpt:Position, destpt:Position) {  
        const Rk= 6373; // mean radius of the earth (km) at 39 degrees from the equator
        let lat1= Convert.degreesToRadians(srcpt[1]);
        let lon1= Convert.degreesToRadians(srcpt[0]);
        let lat2= Convert.degreesToRadians(destpt[1]);
        let lon2= Convert.degreesToRadians(destpt[0]);
        let dlat= lat2 - lat1;
        let dlon= lon2 - lon1;
        let a= Math.pow(Math.sin(dlat/2),2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon/2),2);
        let c= 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); // great circle distance in radians
        return (c * Rk) * 1000; // great circle distance in m
    }

    //** Calculate the bearing between two points in radians	
    static bearingTo(srcpt:Position, destpt:Position) {
        let lat1= Convert.degreesToRadians(srcpt[1]);
        let lat2= Convert.degreesToRadians(destpt[1]);
        let dLon= Convert.degreesToRadians(destpt[0]-srcpt[0]);
        let y= Math.sin(dLon) * Math.cos(lat2);
        let x= Math.cos(lat1)*Math.sin(lat2) -
                Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
        return Math.atan2(y, x);
    }   

    //** Calculate the centre of polygon	
    static centreOfPolygon(coords:Array<Position>): Position { 
        let high:[number,number]= [-180,-90]; 
        let low:[number,number]= [180,90];
        coords.forEach( c=> {
            low[0]= (c[0]<low[0]) ? c[0] : low[0];
            low[1]= (c[1]<low[1]) ? c[1] : low[1];
            high[0]= (c[0]>high[0]) ? c[0] : high[0];
            high[1]= (c[1]>high[1]) ? c[1] : high[1];            
        });
        if(GeoUtils.inDLCrossingZone(low) || GeoUtils.inDLCrossingZone(high) ) {
            let dlCrossing= (low[0]>0 && high[0]<0) ? 1 
                : (low[0]<0 && high[0]>0) ? -1 : 0;
            if(dlCrossing==1) { high[0]= high[0] + 360}
            if(dlCrossing==-1) { high[0]= Math.abs(high[0])-360 }
        }
        return [
            low[0] + ((high[0] - low[0]) / 2),
            low[1] + ((high[1] - low[1]) / 2)
        ];
    } 

    // ** calculate extent from array ot coordinates
    static calulateExtent(line: Array<Position>): Extent {
        let res: Extent= [180,90,-180,-90];
        line.forEach( (c:Position)=> {
            res[0]= c[0]<res[0] ? c[0] : res[0];
            res[1]= c[1]<res[1] ? c[1] : res[1];
            res[2]= c[0]>res[2] ? c[0] : res[2];
            res[3]= c[1]>res[3] ? c[1] : res[3];
        });
        return res;
    }

    /** DateLine Crossing:
     * returns true if point is in the zone for dateline transition 
     * zoneValue: lower end of 180 to xx range within which Longitude must fall for retun value to be true
    **/
    static inDLCrossingZone(coord:Position, zoneValue:number= 170) {
        return (Math.abs(coord[0])>=zoneValue) ? true : false;
    }

    // update line coords for map display (including dateline crossing)
    static mapifyCoords(coords:Array<any>) {
        if(coords.length==0) { return coords }
        let dlCrossing= 0;
        let last= coords[0];
        for(let i=0; i< coords.length; i++) {         
            if( GeoUtils.inDLCrossingZone(coords[i]) || GeoUtils.inDLCrossingZone(last) ) {
                dlCrossing= (last[0]>0 && coords[i][0]<0) ? 1 
                    : (last[0]<0 && coords[i][0]>0) ? -1 : 0;
                if(dlCrossing==1) { coords[i][0]= coords[i][0] + 360}
                if(dlCrossing==-1) { coords[i][0]= Math.abs(coords[i][0])-360 }
            } 
        }
        return coords;
    }   

    // ** return adjusted radius to correctly render circle on ground at given position.
    static mapifyRadius(radius:number, position:Position): number {
        if(typeof radius=== 'undefined' || typeof position=== 'undefined') { return radius }
        return radius / getPointResolution('EPSG:3857', 1, fromLonLat(position));
    }

    // returns true if point is inside the supplied extent
    static inBounds( point: Position, extent: Extent) {
        let dlExtent= JSON.parse(JSON.stringify(extent));
        let dlPoint= [point[0],point[1]];
        // extent crosses date line?
        if(dlExtent[0] > 0 && dlExtent[2] < 0) {
            dlExtent[2] = 360 + dlExtent[2]
            if (dlPoint[0] < 0) {
                dlPoint[0] = 360 + dlPoint[0]
            }
        }
        return (dlPoint[0]>dlExtent[0] && dlPoint[0]<dlExtent[2])
            && (dlPoint[1]>dlExtent[1] && dlPoint[1]<dlExtent[3]); 
    }  

    // returns mapified extent centered at point with boundary radius meters from center
    static calcMapifiedExtent(point: Position, radius: number): Extent {
        const latScale= 111111; // 1 deg of lat in meters
        let lonScale= latScale * Math.cos(Convert.degreesToRadians(point[1]));
        let ext:Extent = [0,0,0,0];

        // latitude bounds
        ext[1]= point[1] + (0-Math.abs(radius)) / latScale;
        ext[3]= point[1] + Math.abs(radius) / latScale;
        // longitude bounds
        ext[0]= point[0] + (0-Math.abs(radius)) / lonScale;
        ext[2]= point[0] + Math.abs(radius) / lonScale;
        return ext;
    }

    // ensure -180<coords<180
    static normaliseCoords(coords:Position)  // Point
    static normaliseCoords(coords:Array<Position>)  //LineString
    static normaliseCoords(coords:Array<Array<Position>>)  // MultiLineString
    static normaliseCoords(coords:any): any {
        if( !Array.isArray(coords) ) { return [0,0] }
        if(typeof coords[0]=='number') {
            if(coords[0]>180) {
                while(coords[0]>180) { coords[0]= coords[0]-360 }
            }
            else if(coords[0]<-180) {
                while(coords[0]<-180) { coords[0]= 360 + coords[0] }
            }
            return coords;
        }
        else if(Array.isArray(coords[0]) ) { 
            coords.forEach( c=> c=this.normaliseCoords(c) );
            return coords;
        }
    }
}

export class GeoHash {
    
    /* (Geohash-specific) Base32 map */
    private BASE32= "0123456789bcdefghjkmnpqrstuvwxyz";

    constructor() {  }

    /** Encodes latitude/longitude to geohash, to specified precision 
     * returns: string
    */
    encode(lat: number, lon: number, precision: number=12):string {
        if (isNaN(lat) || isNaN(lon) || isNaN(precision)) throw new Error('Invalid geohash');

        let idx = 0; // index into base32 map
        let bit = 0; // each char holds 5 bits
        let evenBit = true;
        let geohash = '';

        let latMin =  -90, latMax =  90;
        let lonMin = -180, lonMax = 180;

        while (geohash.length < precision) {
            if (evenBit) {
                // bisect E-W longitude
                let lonMid = (lonMin + lonMax) / 2;
                if (lon >= lonMid) {
                    idx = idx*2 + 1;
                    lonMin = lonMid;
                } else {
                    idx = idx*2;
                    lonMax = lonMid;
                }
            } else {
                // bisect N-S latitude
                let latMid = (latMin + latMax) / 2;
                if (lat >= latMid) {
                    idx = idx*2 + 1;
                    latMin = latMid;
                } else {
                    idx = idx*2;
                    latMax = latMid;
                }
            }
            evenBit = !evenBit;

            if (++bit == 5) {
                // 5 bits gives us a character: append it and start over
                geohash += this.BASE32.charAt(idx);
                bit = 0;
                idx = 0;
            }
        }

        return geohash;
    };

    /* Returns bounds of specified geohash.
     * returns: {sw: [longitude,latitude], ne: [longitude,latitude]}
    */
    decode(geohash: string) {
        if (geohash.length === 0) throw new Error('Invalid geohash');
        geohash = geohash.toLowerCase();
    
        let evenBit = true;
        let latMin =  -90, latMax =  90;
        let lonMin = -180, lonMax = 180;
    
        for (let i=0; i<geohash.length; i++) {
            var chr = geohash.charAt(i);
            var idx = this.BASE32.indexOf(chr);
            if (idx == -1) throw new Error('Invalid geohash');
    
            for (var n=4; n>=0; n--) {
                var bitN = idx >> n & 1;
                if (evenBit) {
                    // longitude
                    var lonMid = (lonMin+lonMax) / 2;
                    if (bitN == 1) {
                        lonMin = lonMid;
                    } else {
                        lonMax = lonMid;
                    }
                } else {
                    // latitude
                    var latMid = (latMin+latMax) / 2;
                    if (bitN == 1) {
                        latMin = latMid;
                    } else {
                        latMax = latMid;
                    }
                }
                evenBit = !evenBit;
            }
        }
    
        return {
            sw: [lonMin, latMin],
            ne: [lonMax, latMax]
        };
    }

    /* return approximate centre of geohash cell 
     * returns: [lon, lat]
    */
    center(geohash: string) {
        let bounds = this.decode(geohash); 
        // now just determine the centre of the cell...
        let latMin = bounds.sw[1], lonMin = bounds.sw[0];
        let latMax = bounds.ne[1], lonMax = bounds.ne[0];
    
        // cell centre
        let lat = (latMin + latMax)/2;
        let lon = (lonMin + lonMax)/2;
    
        // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
        lat = Number( lat.toFixed(Math.floor(2-Math.log(latMax-latMin)/Math.LN10)) );
        lon = Number( lon.toFixed(Math.floor(2-Math.log(lonMax-lonMin)/Math.LN10)) );
    
        return [lon, lat];        
    }

    /* Determines adjacent cell in given direction.
     * geohash: string - Cell to which adjacent cell is required.
     * direction: string - <N,S,E,W>.
     * return: string - Geocode of adjacent cell.
    */
    adjacent(geohash: string, direction: string='n') :string {
        geohash = geohash.toLowerCase();
        direction = direction.toLowerCase();

        if (geohash.length === 0) throw new Error('Invalid geohash');
        if ('nsew'.indexOf(direction) == -1) throw new Error('Invalid direction');

        let neighbour = {
            n: [ 'p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx' ],
            s: [ '14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp' ],
            e: [ 'bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy' ],
            w: [ '238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb' ],
        };
        let border = {
            n: [ 'prxz',     'bcfguvyz' ],
            s: [ '028b',     '0145hjnp' ],
            e: [ 'bcfguvyz', 'prxz'     ],
            w: [ '0145hjnp', '028b'     ],
        };

        let lastCh = geohash.slice(-1);    // last character of hash
        let parent = geohash.slice(0, -1); // hash without last character
        let type = geohash.length % 2;

        // check for edge-cases which don't share common prefix
        if (border[direction][type].indexOf(lastCh) != -1 && parent !== '') {
            parent = this.adjacent(parent, direction);
        }
        // append letter for direction to parent
        return parent + this.BASE32.charAt(neighbour[direction][type].indexOf(lastCh));
    };


    /* Returns all 8 adjacent cells to specified geohash.
     * returns: { n,ne,e,se,s,sw,w,nw: string }
     */
    neighbours(geohash: string) {
        return {
            'n':  this.adjacent(geohash, 'n'),
            'ne': this.adjacent(this.adjacent(geohash, 'n'), 'e'),
            'e':  this.adjacent(geohash, 'e'),
            'se': this.adjacent(this.adjacent(geohash, 's'), 'e'),
            's':  this.adjacent(geohash, 's'),
            'sw': this.adjacent(this.adjacent(geohash, 's'), 'w'),
            'w':  this.adjacent(geohash, 'w'),
            'nw': this.adjacent(this.adjacent(geohash, 'n'), 'w'),
        };
    };    

}