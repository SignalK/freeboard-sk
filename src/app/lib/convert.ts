/** *****************************
 *  Unit Conversion Module
 ****************************** */

/**
 * Conversion from SI base units
 */
const siBaseFn = {
  K: {
    C: (v: number) => v - 273.15,
    F: (v: number) => ((v - 273.15) * 9) / 5 + 32
  },
  rad: {
    degree: (v: number) => (v * 180) / Math.PI
  },
  deg: {
    radian: (v: number) => v * 0.0174532925199433
  },
  ratio: {
    percent: (v: number) => v * 100
  },
  'm/s': {
    kn: (v: number) => v * 1.94384,
    'km/h': (v: number) => v * 3.6,
    mph: (v: number) => v * 2.2369362920544025,
    Bf: (v: number) => (v / 0.836) ^ (2 / 3),
    fps: (v: number) => v * 3.280839895013124
  },
  'rad/s': {
    'deg/s': (v: number) => v * 57.2958,
    rpm: (v: number) => v * 9.549296585513723
  },
  Hz: {
    rpm: (v: number) => v * 60
  },
  m: {
    fathom: (v: number) => v * 0.5467468562055768,
    league: (v: number) => v * 0.0002071251035625518,
    kilometer: (v: number) => v * 0.001,
    mile: (v: number) => v * 0.000621371192237334,
    'naut-mile': (v: number) => v * 0.0005399568034557236,
    foot: (v: number) => v * 3.280839895013124,
    yard: (v: number) => v * 1.0936132983377078
  },
  s: {
    hour: (v: number) => v * 0.0002777777777777778,
    minute: (v: number) => v * 0.016666666666666666,
    day: (v: number) => v * 0.000011574074074074073,
    year: (v: number) => v * 3.168876461541279e-8
  },
  foot: {
    m: (v: number) => v / 3.280839895013124
  }
};

export type SI_BASE_UNIT =
  | 'K'
  | 'rad'
  | 'deg'
  | 'ratio'
  | 'm/s'
  | 'rad/s'
  | 'Hz'
  | 'm'
  | 's';
export type TARGET_UNIT =
  | 'C'
  | 'F'
  | 'degree'
  | 'radian'
  | 'percent'
  | 'kn'
  | 'km/h'
  | 'mph'
  | 'Bf'
  | 'fps'
  | 'deg/s'
  | 'rpm'
  | 'fathom'
  | 'league'
  | 'kilometer'
  | 'mile'
  | 'naut-mile'
  | 'foot'
  | 'yard'
  | 'hour'
  | 'minute'
  | 'day'
  | 'year';

const symbolMap = {
  degree: {
    symbol: String.fromCharCode(186),
    name: 'Degrees'
  },
  radian: {
    symbol: 'rad',
    name: 'Radians'
  },
  percent: {
    symbol: '%',
    name: 'Percent'
  },
  kilometer: {
    symbol: 'km',
    name: 'Kilometer'
  },
  'naut-mile': {
    symbol: 'nmi',
    name: 'Nautical Mile'
  },
  foot: {
    symbol: 'ft',
    name: 'Feet'
  },
  yard: {
    symbol: 'yd',
    name: 'Yard'
  },
  hour: {
    symbol: 'hr',
    name: 'Hour'
  },
  minute: {
    symbol: 'min',
    name: 'Minute'
  },
  F: {
    symbol: `${String.fromCharCode(186)}F`,
    name: 'Fahrenheit'
  },
  C: {
    symbol: `${String.fromCharCode(186)}C`,
    name: 'Celcius'
  }
};

export class Convert {
  /**
   * Transform number value in base unit to target units
   * @param value Number to convert
   * @param baseUnit units of value
   * @param targetUnit units to convert value to
   * @returns Converted number value (null if value is not numeric)
   */
  static transform(
    value: number,
    baseUnit: SI_BASE_UNIT,
    targetUnit: TARGET_UNIT
  ): number {
    if (!Number.isFinite(value)) return null;
    if ((baseUnit as string) === (targetUnit as string)) return value; // no conversion required
    try {
      return siBaseFn[baseUnit][targetUnit](value);
    } catch {
      throw new Error('Transformation not found!');
    }
  }

  static setSymbol(unit: TARGET_UNIT, symbol: string) {
    if (unit in symbolMap) {
      symbolMap[unit].symbol = symbol ?? symbolMap[unit].symbol;
    }
  }

  /**
   * Return symbol for supplied unit type
   * @param unit unit type e.g. 'naut-mile'
   * @returns Symbol for unit e.g. 'nmi'
   */
  static getSymbol(unit: SI_BASE_UNIT | TARGET_UNIT): string {
    return unit in symbolMap ? symbolMap[unit].symbol : unit;
  }

  /**
   * Convert supplied number of degrees to radians
   * @param value Angle in degrees
   * @returns Angle in radians
   */
  static degreesToRadians(value: number): number {
    return siBaseFn['deg']['radian'](value);
  }

  /**
   * Convert supplied number of radians to degrees
   * @param value Angle in radians
   * @returns Angle in degrees
   */
  static radiansToDegrees(value = 0): number {
    return siBaseFn['rad']['degree'](value);
  }

  /**
   * Convert supplied number of nautical miles to kilometers
   * @param value Number value of nautical miles
   * @returns Distance in kilometers
   */
  static nauticalMilesToKm(value = 0): number {
    return value * 1.852;
  }

  /** Return the resultant direction of travel in the range (0 - 2Pi radians) 
   @params angle - Offset from the reference value (-Pi to Pi radians)
   @params ref - Base value the angle is offset from (in radians) -ive = port **
   @returns Resultant direction in the range 0 - 2Pi radians
   */
  static angleToDirection(angle: number, ref: number) {
    const p = Math.PI * 2;
    if (!ref) {
      ref = 0;
    }
    if (!angle) {
      angle = 0;
    }
    if (!Number.isFinite(ref) || !Number.isFinite(angle)) {
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

  /** 
   Return the resultant offset angle of the direction of travel 
   from the base value   
   @params direction - Direction of travel (0 - 2Pi radians)
   @params ref - Reference angle from which direction is offset from (in radians) 
   @returns Angle in radians in the range (-Pi to Pi) -ive = port
  */
  static directionToAngle(direction: number, ref: number) {
    const p = Math.PI * 2;
    if (!ref) {
      ref = 0;
    }
    if (!direction) {
      direction = 0;
    }
    if (!Number.isFinite(ref) || !Number.isFinite(direction)) {
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
}
