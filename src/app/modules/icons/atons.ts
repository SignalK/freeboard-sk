// AtoN Icons

import { AppIconSet } from './app.icons';
import { MapIconDef } from '../map/ol/lib/map-image-registry.service';
import { Convert } from 'src/app/lib/convert';

export const AtoNsType1: AppIconSet = {
  path: './assets/img/atons',
  files: [
    'real-north.svg',
    'real-south.svg',
    'real-east.svg',
    'real-west.svg',
    'real-port.svg',
    'real-starboard.svg',
    'real-danger.svg',
    'real-special.svg',
    'virtual-north.svg',
    'virtual-south.svg',
    'virtual-east.svg',
    'virtual-west.svg',
    'virtual-port.svg',
    'virtual-starboard.svg',
    'virtual-danger.svg',
    'virtual-special.svg'
  ],
  scale: 0.4,
  anchor: [23, 72]
};

const AtoNsType2: AppIconSet = {
  path: './assets/img/atons',
  files: [
    'real-basestation.svg',
    'real-aton.svg',
    'real-safe.svg',
    'virtual-basestation.svg',
    'virtual-aton.svg',
    'virtual-safe.svg'
  ],
  scale: 0.4,
  anchor: [23, 49]
};

export const ATON_TYPE_IDS = {
  aton: 'aton',
  '-2': 'basestation',
  '-1': 'weatherStation',
  //fixed
  9: 'north',
  10: 'east',
  11: 'south',
  12: 'west',
  13: 'port',
  14: 'starboard',
  // floating
  20: 'north',
  21: 'east',
  22: 'south',
  23: 'west',
  24: 'port',
  25: 'starboard',
  28: 'danger',
  29: 'safe',
  30: 'special'
};

const WeatherStation: MapIconDef = {
  path: './assets/img/weather_station.png',
  anchor: [1, 25],
  scale: 0.75
};

// Wind barbs for meteo targets (issue #490). Standard notation — half feather
// = 5 kn, full = 10 kn, pennant = 50 kn — bundled per 5-knot bucket. Drawn
// north-up and anchored at the staff base so the renderer rotates each one to
// the station's reported environment.wind.directionTrue.
export const METEO_WIND_MIN_KTS = 5;
export const METEO_WIND_MAX_KTS = 75;
export const METEO_WIND_STEP_KTS = 5;

const WindBarb = (kts: number): MapIconDef => ({
  path: `./assets/img/wind/barbs/weatherStation-${kts}.svg`,
  anchor: [13, 42],
  scale: 0.9
});

/**
 * Wind-speed bucket (knots, in `METEO_WIND_STEP_KTS` steps) selecting the barb
 * glyph for a meteo target's reported speed. Single source of truth shared by
 * icon selection and barb rotation.
 * @param tws reported wind speed in m/s (Signal K native unit)
 * @returns `null` when no speed is reported, `0` for calm (below the first
 *   bucket → plain windsock), otherwise the bucket in `[MIN..MAX]` knots.
 */
export const meteoWindBucket = (
  tws: number | null | undefined
): number | null => {
  if (typeof tws !== 'number' || !Number.isFinite(tws)) {
    return null;
  }
  const kn = Convert.transform(tws, 'm/s', 'kn');
  if (kn < METEO_WIND_MIN_KTS) {
    return 0;
  }
  return Math.min(
    Math.floor(kn / METEO_WIND_STEP_KTS) * METEO_WIND_STEP_KTS,
    METEO_WIND_MAX_KTS
  );
};

/**
 * @description Build MapIcon definitions for use by MapImageRegistry
 */
export const getAtoNDefs = () => {
  const atonList = {};

  const addToList = (list: AppIconSet) => {
    list.files.forEach((file: string) => {
      const gid = file.slice(0, file.lastIndexOf('-'));
      const id = file.slice(file.lastIndexOf('-') + 1, file.indexOf('.'));
      if (!atonList[gid]) {
        atonList[gid] = {};
      }
      atonList[gid][id] = {
        path: `${list.path}/${file}`,
        scale: list.scale,
        anchor: list.anchor
      };
    });
  };
  addToList(AtoNsType1);
  addToList(AtoNsType2);
  atonList['real']['weatherStation'] = WeatherStation;
  atonList['virtual']['weatherStation'] = WeatherStation;
  // Bundled default barbs — real and virtual share the same artwork; a symbol
  // provider may override any bucket via a `<variant>-weatherStation-<kts>` alias.
  for (
    let kts = METEO_WIND_MIN_KTS;
    kts <= METEO_WIND_MAX_KTS;
    kts += METEO_WIND_STEP_KTS
  ) {
    const def = WindBarb(kts);
    atonList['real'][`weatherStation-${kts}`] = def;
    atonList['virtual'][`weatherStation-${kts}`] = def;
  }
  return atonList;
};
