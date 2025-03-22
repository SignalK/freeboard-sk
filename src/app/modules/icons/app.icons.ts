import { AlertData } from '../alarms';
import {
  SKNote,
  SKRegion,
  SKResourceType,
  SKRoute,
  SKWaypoint
} from '../skresources';

import { OpenBridgeIcons } from './openbridge';
import { PoiIcons } from './poi';

export interface AppIconSet {
  path: string;
  files: Array<string>;
  scale?: number;
  anchor?: [number, number];
}

export interface AppIconDef {
  class?: string;
  svgIcon?: string;
  name?: string;
}

/** Return a list of SVG Icons
 * @description Builds a list of SVG Icons for loading into the IconRegistry
 * @returns Array of files (including path)
 */
export const getSvgList = (): Array<{ id: string; path: string }> => {
  const svgList: Array<{ id: string; path: string }> = [];

  const addToList = (list: AppIconSet, prefix?: string) => {
    list.files.forEach((file: string) => {
      const id = file.slice(0, file.lastIndexOf('.'));
      svgList.push({
        id: `${prefix ?? ''}${id}`,
        path: `${list.path}/${file}`
      });
    });
  };
  addToList(OpenBridgeIcons);
  addToList(PoiIcons, 'sk-');
  return svgList;
};

/**
 * @description Return an icon definition that can be used to assign a mat-icon for a resource
 * @param resourceType The type of resource supplied 'route' | 'waypoint' | 'region' | 'note'
 * @param resource Signal K resource
 * @returns Icon definition object
 */
export const getResourceIcon = (
  resourceType: SKResourceType,
  resource?: SKRoute | SKWaypoint | SKRegion | SKNote | string
): AppIconDef => {
  if (resourceType === 'routes') {
    return { class: 'icon-route', svgIcon: 'route', name: undefined };
  }
  if (resourceType === 'regions') {
    return { class: 'icon-region', svgIcon: undefined, name: 'tab_unselected' };
  }
  if (resourceType === 'notes') {
    let iconDef = {
      class: 'icon-accent',
      svgIcon: undefined,
      name: 'local_offer'
    };
    if (!resource) {
      return iconDef;
    }
    const icon =
      typeof resource === 'string'
        ? resource
        : (resource as SKNote).properties?.skIcon;
    if (!icon) {
      return iconDef;
    } else {
      return {
        class: undefined,
        svgIcon: `sk-${icon}`,
        name: undefined
      };
    }
  }
  if (resourceType === 'waypoints') {
    let iconDef = {
      class: 'icon-waypoint',
      svgIcon: undefined,
      name: 'location_on'
    };
    if (!resource) {
      return iconDef;
    }
    const icon =
      typeof resource === 'string' ? resource : (resource as SKWaypoint).type;
    if (!icon || !['pseudoaton', 'whale', 'alarm-mob'].includes(icon)) {
      return iconDef;
    }
    if (icon === 'pseudoaton') {
      iconDef.class = 'icon-warn';
    } else {
      iconDef = {
        class: 'ob',
        svgIcon: `${icon}`,
        name: undefined
      };
    }
    return iconDef;
  }
};

/**
 * @description Return an icon definition for an Alert
 * @param alert AlertData object
 * @returns Icon Definition object
 */
export const getAlertIcon = (alert: AlertData): AppIconDef => {
  if (
    ['mob', 'fire', 'abandon', 'aground', 'cpa', 'depth'].includes(alert.type)
  ) {
    return {
      class: 'ob',
      svgIcon: `alarm-${alert.type}`,
      name: undefined
    };
  } else if (alert.type === 'arrival') {
    return {
      class: undefined,
      svgIcon: `alarm-${alert.type}`,
      name: 'anchor'
    };
  } else if (alert.type === 'anchor') {
    return {
      class: undefined,
      svgIcon: undefined,
      name: 'anchor'
    };
  } else if (alert.type === 'meteo') {
    return {
      class: undefined,
      svgIcon: undefined,
      name: 'air'
    };
  } else if (alert.priority === 'warn') {
    return {
      class: 'ob',
      svgIcon: 'warning-unack-iec',
      name: undefined
    };
  } else if (['emergency', 'alarm'].includes(alert.priority)) {
    const icon = alert.acknowledged
      ? 'alarm-acknowledged-iec'
      : alert.silenced
      ? 'alarm-silenced-iec'
      : 'alarm-acknowledged-iec';
    return {
      class: undefined,
      svgIcon: icon,
      name: undefined
    };
  } else {
    const icon = alert.acknowledged
      ? 'warning-acknowledged-iec'
      : alert.silenced
      ? 'warning-silenced-iec'
      : 'warning-unack-iec';
    return {
      class: undefined,
      svgIcon: icon,
      name: undefined
    };
  }
};
