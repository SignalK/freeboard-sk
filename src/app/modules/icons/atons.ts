// AtoN Icons

import { AppIconSet } from './app.icons';
import { MapIconDef } from '../map/ol/lib/map-image-registry.service';

const AtoNsReal: AppIconSet = {
  path: './assets/img/atons',
  files: [
    'real-aton.svg',
    'real-north.svg',
    'real-south.svg',
    'real-east.svg',
    'real-west.svg',
    'real-port.svg',
    'real-starboard.svg',
    'real-danger.svg',
    'real-safe.svg',
    'real-special.svg'
  ],
  scale: 0.4,
  anchor: [23, 49]
};

const AtoNsVirtual: AppIconSet = {
  path: './assets/img/atons',
  files: [
    'virtual-aton.svg',
    'virtual-north.svg',
    'virtual-south.svg',
    'virtual-east.svg',
    'virtual-west.svg',
    'virtual-port.svg',
    'virtual-starboard.svg',
    'virtual-danger.svg',
    'virtual-safe.svg',
    'virtual-special.svg'
  ],
  scale: 0.4,
  anchor: [23, 49]
};

const WeatherStation: MapIconDef = {
  path: './assets/img/weather_station.png',
  anchor: [1, 25],
  scale: 0.75
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
  addToList(AtoNsReal);
  addToList(AtoNsVirtual);
  atonList['real']['weatherStation'] = WeatherStation;
  atonList['virtual']['weatherStation'] = WeatherStation;
  return atonList;
};
