// Vessel Icons

import { AppIconSet } from './app.icons';

const VesselSelfIcons = {
  path: './assets/img/vessels',
  scale: 0.75,
  anchor: [9.5, 22.5],
  files: [
    'ais_self.svg'
    //'ship_red.png',
    //'ship_blur.png'
  ]
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
  buddy: 'ais_buddy',
  flag: 'ais_flag.svg'
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
  //vesselList['default'] = DefaultNoteIcon;
  addToList(VesselAisIcons);

  return vesselList;
};
