// POI Icons

import { AppIconSet } from './app.icons';

const DefaultNoteIcon = {
  path: './assets/img/note.png',
  scale: 1,
  anchor: [5, 3]
};

export const PoiIcons: AppIconSet = {
  path: './assets/img/poi',
  scale: 0.65,
  anchor: [1, 37],
  files: [
    'anchorage.svg',
    'boatramp.svg',
    'bridge.svg',
    'business.svg',
    'dam.svg',
    'ferry.svg',
    'hazard.svg',
    'inlet.svg',
    'lock.svg',
    'marina.svg',
    'dock.svg',
    'turning-basin.svg',
    'radio-call-point.svg',
    'transhipment-dock.svg',
    'notice-to-mariners.svg',
    'navigation-structure.svg',
    'fuel.svg',
    'tunnel.svg',
    'waterway-guage.svg'
  ]
};

/**
 * @description Build MapIcon definitions for use by MapImageRegistry
 */
export const getPoiDefs = () => {
  const poiList = {};

  const addToList = (list: AppIconSet) => {
    list.files.forEach((file: string) => {
      const id = file.slice(0, file.indexOf('.'));
      poiList[id] = {
        path: `${list.path}/${file}`,
        scale: list.scale,
        anchor: list.anchor
      };
    });
  };
  poiList['default'] = DefaultNoteIcon;
  addToList(PoiIcons);

  return poiList;
};
