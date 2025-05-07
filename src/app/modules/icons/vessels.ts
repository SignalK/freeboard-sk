// Vessel Icons

import { AppIconSet } from './app.icons';

const VesselSelfIcons: AppIconSet = {
  path: './assets/img/vessels',
  scale: 0.75,
  anchor: [9.5, 22.5],
  files: ['ais_self.svg']
};

export const VesselAisIcons: AppIconSet = {
  path: './assets/img/vessels',
  scale: 1.0,
  anchor: [17, 16],
  files: [
    'ais_active.svg',
    'ais_buddy.svg',
    'ais_cargo.svg',
    'ais_flag.svg',
    'ais_highspeed.svg',
    'ais_inactive.svg',
    'ais_other.svg',
    'ais_passenger.svg',
    'ais_special.svg',
    'ais_tanker.svg'
  ]
};

export const AIS_TYPE_IDS = {
  10: 'ais_active',
  20: 'ais_active',
  30: 'ais_active',
  40: 'ais_highspeed',
  50: 'ais_special',
  60: 'ais_passenger',
  70: 'ais_cargo',
  80: 'ais_tanker',
  90: 'ais_other',
  default: 'ais_active',
  inactive: 'ais_inactive',
  focused: 'ais_self',
  buddy: 'ais_buddy'
};

export const AIS_MOORED_STYLE_IDS = {
  // [stroke, fill]
  10: ['white', '#FF00FF'],
  20: ['white', '#FF00FF'],
  30: ['white', '#FF00FF'],
  40: ['#7F6A00', '#FFE97F'],
  50: ['#000000', '#00FFFF'],
  60: ['#0026FF', '#0026FF'],
  70: ['#000000', '#009931'],
  80: ['#7F0000', '#FF0000'],
  90: ['#000000', '#808080'],
  default: ['white', '#FF00FF'],
  inactive: ['FF00DC', 'white'],
  buddy: ['white', '#4CFF00']
};

/**
 * @description Build MapIcon definitions for use by MapImageRegistry
 */
export const getVesselDefs = () => {
  const vesselList = {};

  const addToList = (list: AppIconSet) => {
    list.files.forEach((file: string) => {
      const id = file.slice(0, file.indexOf('.'));
      vesselList[id] = {
        path: `${list.path}/${file}`,
        scale: list.scale,
        anchor: list.anchor
      };
    });
  };
  addToList(VesselAisIcons);
  addToList(VesselSelfIcons);

  return vesselList;
};
