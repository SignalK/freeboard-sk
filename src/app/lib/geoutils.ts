/*******************************
    GeoUtils Class Module       
*******************************/

import { Convert } from './convert';

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
    static destCoordinate(lat1, lon1, brng, dist): [number,number] {
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
    static toGo(srcpt, destpt) {
        let brg= GeoUtils.bearingTo(srcpt, destpt);
        let dst= GeoUtils.distanceTo(srcpt, destpt);
        return { bearing: brg, distance: dst }
    }

    //** Calculate the great circle distance between two points in metres
    static distanceTo(srcpt, destpt) {  
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
    static bearingTo(srcpt, destpt) {  
        let lat1= Convert.degreesToRadians(srcpt[1]);
        let lat2= Convert.degreesToRadians(destpt[1]);
        let dLon= Convert.degreesToRadians(destpt[0]-srcpt[0]);
        let y= Math.sin(dLon) * Math.cos(lat2);
        let x= Math.cos(lat1)*Math.sin(lat2) -
                Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
        return Math.atan2(y, x);
    }   
   
}