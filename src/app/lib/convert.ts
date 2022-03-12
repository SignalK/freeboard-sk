/*******************************
    Unit Conversion Class Module       
*******************************/

export class Convert {

    constructor() {}
    // ******* Temperature **********
    static  celciusToKelvin(val:number=0) { return val + 273.15 }
    static  kelvinToCelcius(val:number=0) { return val - 273.15 }
    static  kelvinToFarenheit(val:number=0) { return  val*(9/5)-459.67 }
    

    //******** Angles ***************
    static  degreesToRadians(val=0) {  return val * Math.PI/180; }
    //** convert radians to degrees
    static  radiansToDegrees(val=0) { return val * 180 / Math.PI; }

    /** return Direction 0-360 (radians) for given angle (radians) 
     * from the suplied reference value(radians) -ive = port **
    */
    static angleToDirection(angle:number, ref:number) {
        let p= Math.PI * 2;
        if(!ref) { ref=0 }
        if(!angle) { angle=0 }
        if(isNaN(ref) || isNaN(angle)) { return null }
        let res= ref + angle;
        if(res>p) { return res - p }
        else if( res<0 ) { return p + res }
        else { return res }
    }

    // ** return Angle (-180 to 180 in radians) for given direction from the suplied reference value (radians) **
    static directionToAngle(direction, ref) {
        let p= Math.PI * 2;
        if(!ref) { ref=0 }
        if(!direction) { direction=0 }
        if(isNaN(ref) || isNaN(direction)) { return null }
        let res= ref - direction;
        let a:number;
        if(res>0) { a= (res>Math.PI) ? p-res : 0-res }
        else if( res<0 ) {
            let rx= Math.abs(res);
            a= (rx> Math.PI) ? rx-p : rx;
        }
        else { a= res }
        return a;
    }    

    // ******* Distance / Speed ********
    //** knots to km/h **
    static  knotsToKm(val: number): number {  return val * 1.852; }
    //** nautical miles to km**
    static  nauticalMilesToKm(val: number): number { return val * 1.852; }    
    //** knots to msec **
    static  knotsToMSec(val: number): number { return val * 0.51444325460445; }    

    //** km/h to knots **
    static  kmToKnots(val: number): number { return val * 0.539957; }
    //** km to nautical miles **
    static  kmToNauticalMiles(val: number): number { return val * 0.539957; }
    //** km to miles **
    static  kmToMiles(val: number): number { return val * 0.621371; }	
    //** m/sec to knots **
    static  msecToKnots(val: number): number { return val * 1.94384; }
    //** m/sec to km/h **
    static  msecToKmh(val: number): number { return val * 3.6; }
    //** m/sec to km/h **
    static  msecToMph(val: number): number { return val * 2.23694; }

    //** nautical miles to miles**
    static  nauticalMilesToMiles(val: number): number { return val * 1.15078; }
    //**  miles to km**
    static  milesToKm(val: number): number { return val * 1.60934; }		
    //** miles to nautical miles **
    static  milesToNauticalMiles(val: number): number { return val * 0.868976; }

    //******** frequency ***************
    static  rpmToHertz(val: number): number {  return val / 60; }    
}
