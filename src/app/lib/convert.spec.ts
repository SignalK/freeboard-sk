import { expect, describe, it } from 'vitest';
import { Convert } from './convert';

describe('Temperature Conversions', () => {
  it('Kelvin to Celcius', () => {
    expect(Convert.transform(0, 'K', 'C')).toBe(-273.15);
  });

  it('Kelvin to Fahrenheit', () => {
    expect(Convert.transform(273.15, 'K', 'F')).toBe(32);
  });
});

describe('Angle Conversions', () => {
  it('Radians to degrees', () => {
    expect(Convert.transform(Math.PI / 2, 'rad', 'degree')).toBe(90);
  });

  it('Degrees to Radians', () => {
    expect(Convert.transform(90, 'deg', 'radian')).toBe(1.570796326794897);
  });
});

describe('Ratio Conversions', () => {
  it('Ratio to percent', () => {
    expect(Convert.transform(0.5, 'ratio', 'percent')).toBe(50);
  });
});

describe('Speed Conversions', () => {
  it('m/s to km/h', () => {
    expect(Convert.transform(1, 'm/s', 'km/h')).toBe(3.6);
  });
  it('m/s to kn', () => {
    expect(Convert.transform(1, 'm/s', 'kn')).toBe(1.94384);
  });
  it('m/s to km/h', () => {
    expect(Convert.transform(1, 'm/s', 'km/h')).toBe(3.6);
  });
  it('m/s to mph', () => {
    expect(Convert.transform(1, 'm/s', 'mph')).toBe(2.2369362920544025);
  });
  it('m/s to Bf', () => {
    expect(Convert.transform(25, 'm/s', 'Bf')).toBe(29);
  });
  it('m/s to fps', () => {
    expect(Convert.transform(1, 'm/s', 'fps')).toBe(3.280839895013124);
  });
});

describe('Angular Velocity Conversions', () => {
  it('rad/s to deg/s', () => {
    expect(Convert.transform(1, 'rad/s', 'deg/s')).toBe(57.2958);
  });
  it('rad/s to rpm', () => {
    expect(Convert.transform(1, 'rad/s', 'rpm')).toBe(9.549296585513723);
  });
});

describe('Frequency Conversions', () => {
  it('Hz to rpm', () => {
    expect(Convert.transform(1, 'Hz', 'rpm')).toBe(60);
  });
});

describe('Distance Conversions', () => {
  it('Meters to Nautical Miles', () => {
    expect(Convert.transform(1, 'm', 'naut-mile')).toBe(0.0005399568034557236);
  });
  it('Meters to Kilometer', () => {
    expect(Convert.transform(1, 'm', 'kilometer')).toBe(0.001);
  });
  it('Meters to mile', () => {
    expect(Convert.transform(1, 'm', 'mile')).toBe(0.000621371192237334);
  });
  it('Meters to foot', () => {
    expect(Convert.transform(1, 'm', 'foot')).toBe(3.280839895013124);
  });
  it('Meters to yard', () => {
    expect(Convert.transform(1, 'm', 'yard')).toBe(1.0936132983377078);
  });
  it('Meters to fathoms', () => {
    expect(Convert.transform(1, 'm', 'fathom')).toBe(0.5467468562055768);
  });
  it('Meters to league', () => {
    expect(Convert.transform(1, 'm', 'league')).toBe(0.0002071251035625518);
  });
});

describe('Time Conversions', () => {
  it('Seconds to hour', () => {
    expect(Convert.transform(1, 's', 'hour')).toBe(0.0002777777777777778);
  });
  it('Seconds to minute', () => {
    expect(Convert.transform(1, 's', 'minute')).toBe(0.016666666666666666);
  });
  it('Seconds to day', () => {
    expect(Convert.transform(1, 's', 'day')).toBe(0.000011574074074074073);
  });
  it('Seconds to year', () => {
    expect(Convert.transform(1, 's', 'year')).toBe(3.168876461541279e-8);
  });
});
