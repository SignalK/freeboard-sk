import { describe, expect, it } from 'vitest';
import {
  entryFormatFor,
  formatAngle,
  fromUtm,
  parseAngle,
  toUtm,
  utmZoneFor
} from './coord-entry';

describe('parseAngle', () => {
  it('reads decimal degrees, signed or with a hemisphere letter', () => {
    expect(parseAngle('47.6375', 'lat')).toBeCloseTo(47.6375, 9);
    expect(parseAngle('-3.5', 'lon')).toBeCloseTo(-3.5, 9);
    expect(parseAngle('+3.5', 'lon')).toBeCloseTo(3.5, 9);
    expect(parseAngle('47.6375 S', 'lat')).toBeCloseTo(-47.6375, 9);
    expect(parseAngle('W 3.5°', 'lon')).toBeCloseTo(-3.5, 9);
  });

  it('reads degrees and decimal minutes', () => {
    expect(parseAngle(`47° 38.250' N`, 'lat')).toBeCloseTo(47.6375, 9);
    expect(parseAngle('47 38.25', 'lat')).toBeCloseTo(47.6375, 9);
    expect(parseAngle('003°30.000W', 'lon')).toBeCloseTo(-3.5, 9);
  });

  it('reads degrees, minutes and seconds', () => {
    expect(parseAngle(`47° 38' 15" N`, 'lat')).toBeCloseTo(47.6375, 9);
    expect(parseAngle('47:38:15', 'lat')).toBeCloseTo(47.6375, 9);
    expect(parseAngle('47°38′15.5″S', 'lat')).toBeCloseTo(
      -(47 + 38 / 60 + 15.5 / 3600),
      9
    );
  });

  it('accepts a comma as decimal separator', () => {
    expect(parseAngle(`47° 38,25' N`, 'lat')).toBeCloseTo(47.6375, 9);
    expect(parseAngle('-3,5', 'lon')).toBeCloseTo(-3.5, 9);
  });

  it('is case-insensitive about the hemisphere', () => {
    expect(parseAngle('3.5 w', 'lon')).toBeCloseTo(-3.5, 9);
  });

  it('accepts the range limits', () => {
    expect(parseAngle('90 S', 'lat')).toBe(-90);
    expect(parseAngle('180', 'lon')).toBe(180);
    expect(parseAngle('0 S', 'lat')).toBe(0);
  });

  it.each([
    ['', 'lat'],
    ['   ', 'lat'],
    ['abc', 'lat'],
    ['91', 'lat'],
    ['180.0001', 'lon'],
    ['47 E', 'lat'], // E/W is not a latitude hemisphere
    ['3 N', 'lon'],
    ['-47 N', 'lat'], // sign and letter contradict
    ['47 60', 'lat'], // minutes must stay below 60
    ['47 30 60', 'lat'],
    ['47.5 30', 'lat'], // only the last part may be fractional
    ['47 30 15 10', 'lat'], // more than three parts
    ['47..5', 'lat'],
    ['N 47 E', 'lat']
  ] as const)('rejects %j as a %s', (text, axis) => {
    expect(parseAngle(text, axis)).toBeNull();
  });
});

describe('formatAngle', () => {
  it('formats decimal degrees as a signed number', () => {
    expect(formatAngle(47.6375, 'DD', 'lat')).toBe('47.6375');
    expect(formatAngle(-3.123456789, 'DD', 'lon')).toBe('-3.123457');
  });

  it('formats degrees and decimal minutes with the hemisphere', () => {
    expect(formatAngle(47.6375, 'DDM', 'lat')).toBe(`47° 38.2500' N`);
    expect(formatAngle(-3.5, 'DDM', 'lon')).toBe(`3° 30.0000' W`);
    expect(formatAngle(-0.05, 'DDM', 'lat')).toBe(`0° 03.0000' S`);
  });

  it('formats degrees, minutes and seconds with the hemisphere', () => {
    expect(formatAngle(47.6375, 'DMS', 'lat')).toBe(`47° 38' 15.00" N`);
    expect(formatAngle(-122.5, 'DMS', 'lon')).toBe(`122° 30' 00.00" W`);
  });

  it('carries a rounded-up minute or second into the next part', () => {
    expect(formatAngle(47.99999999, 'DDM', 'lat')).toBe(`48° 00.0000' N`);
    expect(formatAngle(47.99999999, 'DMS', 'lat')).toBe(`48° 00' 00.00" N`);
  });

  it.each([
    ['DD', 'lat', 47.6375],
    ['DDM', 'lat', -33.85678],
    ['DMS', 'lon', 151.21534],
    ['DMS', 'lon', -0.0001]
  ] as const)(
    '%s text reads back through parseAngle (%s %d)',
    (fmt, axis, v) => {
      const back = parseAngle(formatAngle(v, fmt, axis), axis);
      expect(back).not.toBeNull();
      expect(Math.abs((back as number) - v)).toBeLessThan(1e-5);
    }
  );
});

describe('entryFormatFor', () => {
  it('follows the position display setting', () => {
    expect(entryFormatFor('XY')).toBe('DD');
    expect(entryFormatFor('SHDd')).toBe('DD');
    expect(entryFormatFor('HDd')).toBe('DD');
    expect(entryFormatFor('DMdH')).toBe('DDM');
    expect(entryFormatFor('HDMS')).toBe('DMS');
    expect(entryFormatFor('DHMS')).toBe('DMS');
  });
});

describe('UTM', () => {
  it('converts a northern position', () => {
    const utm = toUtm(2.2945, 48.8584);
    expect(utm).not.toBeNull();
    expect(utm?.zone).toBe(31);
    expect(utm?.hemisphere).toBe('N');
    expect(Math.round(utm?.easting ?? 0)).toBe(448252);
    expect(Math.round(utm?.northing ?? 0)).toBe(5411955);
  });

  it('converts a southern position', () => {
    const utm = toUtm(151.2153, -33.8568);
    expect(utm?.zone).toBe(56);
    expect(utm?.hemisphere).toBe('S');
    expect(Math.round(utm?.easting ?? 0)).toBe(334901);
    expect(Math.round(utm?.northing ?? 0)).toBe(6252289);
  });

  it('round-trips through fromUtm', () => {
    for (const [lon, lat] of [
      [2.2945, 48.8584],
      [151.2153, -33.8568],
      [-70.6693, -33.4489],
      [179.9, 10]
    ]) {
      const back = fromUtm(toUtm(lon, lat)!);
      expect(back).not.toBeNull();
      expect(back![0]).toBeCloseTo(lon, 6);
      expect(back![1]).toBeCloseTo(lat, 6);
    }
  });

  it('is undefined beyond 80°S and 84°N', () => {
    expect(toUtm(0, 84.5)).toBeNull();
    expect(toUtm(0, -80.5)).toBeNull();
    expect(toUtm(0, 84)).not.toBeNull();
    expect(toUtm(0, -80)).not.toBeNull();
  });

  it('applies the Norway and Svalbard zone exceptions', () => {
    expect(utmZoneFor(5, 60)).toBe(32);
    expect(utmZoneFor(5, 50)).toBe(31);
    expect(utmZoneFor(15, 78)).toBe(33);
    expect(utmZoneFor(180, 0)).toBe(60);
  });

  it('converts into the exception zones', () => {
    expect(toUtm(5, 60)?.zone).toBe(32);
    expect(toUtm(15, 78)?.zone).toBe(33);
  });

  it('rejects out-of-range input', () => {
    const ok = {
      zone: 31,
      hemisphere: 'N' as const,
      easting: 448252,
      northing: 5411955
    };
    expect(fromUtm(ok)).not.toBeNull();
    expect(fromUtm({ ...ok, zone: 0 })).toBeNull();
    expect(fromUtm({ ...ok, zone: 61 })).toBeNull();
    expect(fromUtm({ ...ok, zone: 31.5 })).toBeNull();
    expect(fromUtm({ ...ok, easting: 0 })).toBeNull();
    expect(fromUtm({ ...ok, easting: 1_000_000 })).toBeNull();
    expect(fromUtm({ ...ok, northing: -1 })).toBeNull();
    expect(fromUtm({ ...ok, northing: NaN })).toBeNull();
  });
});
