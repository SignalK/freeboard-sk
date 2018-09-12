/*******************************
    Unit Conversion Class Module       
*******************************/

export class Convert {

    constructor() {}
    // ******* Temperature **********
    static  celciusToKelvin(val=0) { return val + 273.15; }
    static  kelvinToCelcius(val=0) { return val - 273.15; }

    //******** Angles ***************
    static  degreesToRadians(val=0) {  return val * Math.PI/180; }
    //** convert radians to degrees
    static  radiansToDegrees(val=0) { return val * 180 / Math.PI; }

    // ** return Direction 0-360 for given angle from the suplied reference value -ive = port **
    static angleToDirection(angle, ref) {
        let r= parseFloat(ref);
        let a= parseFloat(angle);
        if(isNaN(r) || isNaN(a)) { return null }
        let res= r + a;
        if(res>360) { return res - 360 }
        else if( res<0 ) { return 360 + res }
        else { return res }
    }

    // ** return Angle (-180 to 180) for given direction from the suplied reference value **
    static directionToAngle(direction, ref) {
        let r= parseFloat(ref);
        let d= parseFloat(direction);
        if(isNaN(r) || isNaN(d)) { return null }
        let res= r - d;
        let a;
        if(res>0) {
            a= (res>180) ? 360-res : 0-res;
        }
        else if( res<0 ) {
            let rx= Math.abs(res);
            a= (rx>180) ? rx-360 : rx;
        }
        else { a= res }
        /*console.log('direction: ' + direction);
        console.log('HDG: ' + ref);
        console.log('angle: ' + a);*/
        return a;
    }    

    // ******* Distance / Speed ********
    //** knots to km/h **
    static  knotsToKm(val) {  return val * 1.852; }
    //** nautical miles to km**
    static  nauticalMilesToKm(val=0) { return val * 1.852; }    
    //** knots to msec **
    static  knotsToMSec(val=0) { return val * 0.51444325460445; }    

    //** km/h to knots **
    static  kmToKnots(val) { return val * 0.539957; }
    //** km to nautical miles **
    static  kmToNauticalMiles(val=0) { return val * 0.539957; }
    //** km to miles **
    static  kmToMiles(val=0) { return val * 0.621371; }	
    //** m/sec to knots **
    static  msecToKnots(val) { return val * 1.94384; }

    //** nautical miles to miles**
    static  nauticalMilesToMiles(val=0) { return val * 1.15078; }
    //**  miles to km**
    static  milesToKm(val=0) { return val * 1.60934; }		
    //** miles to nautical miles **
    static  milesToNauticalMiles(val=0) { return val * 0.868976; }

    //******** frequency ***************
    static  rpmToHertz(val=0) {  return val / 60; }    
}
