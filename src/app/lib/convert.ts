/*******************************
    Unit Conversion Class Module       
*******************************/

export class Convert {
  //constructor() {}
  // ******* Temperature **********
  static celciusToKelvin(val = 0) {
    return val + 273.15;
  }
  static kelvinToCelcius(val = 0) {
    return val - 273.15;
  }
  static kelvinToFarenheit(val = 0) {
    return val * (9 / 5) - 459.67;
  }

  //******** Angles ***************
  static degreesToRadians(val = 0) {
    return (val * Math.PI) / 180;
  }
  //** convert radians to degrees
  static radiansToDegrees(val = 0) {
    return (val * 180) / Math.PI;
  }

  /** Return resultant direction direction (0 - 2Pi radians) 
   @params angle (+/- in radians)
   @params ref Base value the angle is offset from (in radians) -ive = port **
   @returns Direction (0 - 2Pi radians) 
   */
  static angleToDirection(angle: number, ref: number) {
    const p = Math.PI * 2;
    if (!ref) {
      ref = 0;
    }
    if (!angle) {
      angle = 0;
    }
    if (isNaN(ref) || isNaN(angle)) {
      return null;
    }
    const res = ref + angle;
    if (res > p) {
      return res - p;
    } else if (res < 0) {
      return p + res;
    } else {
      return res;
    }
  }

  /** Return resultant Angle (-Pi to Pi radians)  
   @params Direction (0 - 2Pi radians)
   @params ref Base value the angle is offset from (in radians) 
   @returns   angle (+/- in radians) -ive = port
  */
  static directionToAngle(direction, ref) {
    const p = Math.PI * 2;
    if (!ref) {
      ref = 0;
    }
    if (!direction) {
      direction = 0;
    }
    if (isNaN(ref) || isNaN(direction)) {
      return null;
    }
    const res = ref - direction;
    let a: number;
    if (res > 0) {
      a = res > Math.PI ? p - res : 0 - res;
    } else if (res < 0) {
      const rx = Math.abs(res);
      a = rx > Math.PI ? rx - p : rx;
    } else {
      a = res;
    }
    return a;
  }

  // ******* Distance / Speed ********
  //** knots to km/h **
  static knotsToKm(val: number): number {
    return val * 1.852;
  }
  //** nautical miles to km**
  static nauticalMilesToKm(val: number): number {
    return val * 1.852;
  }
  //** knots to msec **
  static knotsToMSec(val: number): number {
    return val * 0.51444325460445;
  }

  //** km/h to knots **
  static kmToKnots(val: number): number {
    return val * 0.539957;
  }
  //** km to nautical miles **
  static kmToNauticalMiles(val: number): number {
    return val * 0.539957;
  }
  //** km to miles **
  static kmToMiles(val: number): number {
    return val * 0.621371;
  }
  //** m to feet **
  static metersToFeet(val: number): number {
    return val * 3.28084;
  }

  //** m/sec to knots **
  static msecToKnots(val: number): number {
    return val * 1.94384;
  }
  //** m/sec to km/h **
  static msecToKmh(val: number): number {
    return val * 3.6;
  }
  //** m/sec to km/h **
  static msecToMph(val: number): number {
    return val * 2.23694;
  }

  //** nautical miles to miles**
  static nauticalMilesToMiles(val: number): number {
    return val * 1.15078;
  }
  //**  miles to km**
  static milesToKm(val: number): number {
    return val * 1.60934;
  }
  //** miles to nautical miles **
  static milesToNauticalMiles(val: number): number {
    return val * 0.868976;
  }

  //******** frequency ***************
  static rpmToHertz(val: number): number {
    return val / 60;
  }
}
