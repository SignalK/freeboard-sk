// Waypoint Icons

import { AppIconSet } from './app.icons';

const WaypointMarkerIcons: AppIconSet = {
  path: './assets/img/waypoints',
  scale: 1,
  anchor: [10.5, 25],
  files: ['waypoint.png', 'marker-blue.png', 'marker-green.png']
};

export const WaypointIcons: AppIconSet = {
  path: './assets/img/waypoints',
  scale: 1.15,
  anchor: [12, 24],
  files: [
    'start-pin.svg',
    'start-boat.svg',
    'whale.svg',
    'pob.svg',
    'pseudoaton.svg'
  ]
};

/**
 * @description Build MapIcon definitions for use by MapImageRegistry
 */
export const getWaypointDefs = () => {
  const waypointList = {};

  const addToList = (list: AppIconSet) => {
    list.files.forEach((file: string) => {
      const id = file.slice(0, file.indexOf('.'));
      waypointList[id] = {
        path: `${list.path}/${file}`,
        scale: list.scale,
        anchor: list.anchor
      };
    });
  };
  addToList(WaypointMarkerIcons);
  addToList(WaypointIcons);
  waypointList['default'] = waypointList['waypoint'];
  return waypointList;
};
