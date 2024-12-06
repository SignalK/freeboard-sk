import { Position } from './types';
import { Convert } from './lib/convert';

// validate supplied settings against base config
export function validateConfig(settings: IAppConfig): boolean {
  let result = true;
  const skeys = Object.keys(settings);
  Object.keys(DefaultConfig).forEach((i) => {
    if (!skeys.includes(i)) {
      result = false;
    }
  });
  return result;
}

// clean loaded app config
export function cleanConfig(
  settings: IAppConfig,
  hostParams: { [key: string]: unknown }
) {
  if (typeof settings.fixedLocationMode === 'undefined') {
    settings.fixedLocationMode = false;
  }
  if (typeof settings.fixedPosition === 'undefined') {
    settings.fixedPosition = [0, 0];
  }
  if (typeof settings.muteSound === 'undefined') {
    settings.muteSound = false;
  }

  // changeover 2.10.1 - for removal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (settings as any).vessel !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings.selections.vessel = Object.assign({}, (settings as any).vessel);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (settings as any).vessel;
  }

  if (typeof settings.selections.vessel === 'undefined') {
    settings.selections.vessel = {
      trail: true,
      windVectors: true,
      laylines: false,
      cogLine: 10,
      aisCogLine: 10,
      headingLineSize: -1
    };
  }
  if (typeof settings.selections.vessel.laylines === 'undefined') {
    settings.selections.vessel.laylines = false;
  }
  if (typeof settings.selections.vessel.aisCogLine === 'undefined') {
    settings.selections.vessel.aisCogLine = 10;
  }

  if (typeof settings.map.limitZoom === 'undefined') {
    settings.map.limitZoom = false;
  }

  if (typeof settings.map.invertColor === 'undefined') {
    settings.map.invertColor = false;
  }

  if (typeof settings.map.lockMoveMap === 'undefined') {
    settings.map.lockMoveMap = false;
  }

  if (typeof settings.anchorRadius === 'undefined') {
    settings.anchorRadius = 40;
  }

  if (typeof settings.selections.aisShowTrack === 'undefined') {
    settings.selections.aisShowTrack = false;
  }

  if (typeof settings.selections.aisTargetTypes === 'undefined') {
    settings.selections.aisTargetTypes = [];
  }

  if (typeof settings.selections.aisFilterByShipType === 'undefined') {
    settings.selections.aisFilterByShipType = false;
  }

  if (typeof settings.selections.labelsMinZoom === 'undefined') {
    settings.selections.labelsMinZoom = 10;
  }

  if (typeof settings.toolBarButtons === 'undefined') {
    settings.toolBarButtons = true;
  }

  if (typeof settings.units.temperature === 'undefined') {
    settings.units.temperature = 'c';
  }

  if (typeof settings.selections === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (settings as any).selections = {};
  }

  if (typeof settings.selections.aisWindMinZoom === 'undefined') {
    settings.selections.aisWindMinZoom = 15;
  }
  if (typeof settings.selections.aisWindApparent === 'undefined') {
    settings.selections.aisWindApparent = false;
  }
  if (typeof settings.selections.notesMinZoom === 'undefined') {
    settings.selections.notesMinZoom = 10;
  }
  if (typeof settings.selections.preferredPaths === 'undefined') {
    settings.selections.preferredPaths = {
      tws: 'environment.wind.speedTrue',
      twd: 'environment.wind.directionTrue',
      heading: 'navigation.courseOverGroundTrue',
      course: 'navigation.courseGreatCircle'
    };
  }
  if (typeof settings.selections.preferredPaths.course === 'undefined') {
    settings.selections.preferredPaths.course = 'navigation.courseGreatCircle';
  }
  if (typeof settings.selections.pluginFavourites === 'undefined') {
    settings.selections['pluginFavourites'] = [];
  }
  if (typeof settings.selections.positionFormat === 'undefined') {
    settings.selections['positionFormat'] = 'XY';
  }
  if (typeof settings.selections.chartOrder === 'undefined') {
    settings.selections['chartOrder'] = [];
  }
  if (typeof settings.selections.tracks === 'undefined') {
    settings.selections.tracks = [];
  }
  if (typeof settings.selections.trailDuration === 'undefined') {
    settings.selections.trailDuration = 24;
  }
  if (typeof settings.selections.trailResolution === 'undefined') {
    settings.selections.trailResolution = {
      lastHour: '5s',
      next23: '1m',
      beyond24: '5m'
    };
  }
  if (typeof settings.selections.resourceSets === 'undefined') {
    settings.selections.resourceSets = {};
  }
  if (typeof settings.selections.aisMaxAge === 'undefined') {
    settings.selections.aisMaxAge = 540000;
  }
  if (typeof settings.selections.aisStaleAge === 'undefined') {
    settings.selections.aisStaleAge = 360000;
  }
  if (typeof settings.selections.aisProfile === 'undefined') {
    settings.selections.aisProfile = 0;
  }
  if (typeof settings.selections.aisState === 'undefined') {
    settings.selections.aisState = [];
  }
  if (typeof settings.selections.signalk === 'undefined') {
    settings.selections.signalk = {
      vessels: true,
      atons: true,
      aircraft: false,
      sar: false,
      meteo: true,
      maxRadius: 0,
      proxied: true
    };
  }
  // force proxied = true for stored config.
  settings.selections.signalk.proxied = true;

  if (typeof settings.selections.signalk.meteo === 'undefined') {
    settings.selections.signalk.meteo = true;
  }
  if (typeof settings.selections.wakeLock === 'undefined') {
    settings.selections.wakeLock = false;
  }

  if (typeof settings.selections.course === 'undefined') {
    settings.selections.course = {
      autoNextPointOnArrival: false,
      autoNextPointDelay: 5000,
      autoNextPointTrigger: 'perpendicularPassed'
    };
  } else {
    if (
      typeof settings.selections.course.autoNextPointTrigger === 'undefined'
    ) {
      settings.selections.course.autoNextPointTrigger = 'perpendicularPassed';
    }
  }

  if (typeof settings.selections.s57Options === 'undefined') {
    settings.selections.s57Options = {
      graphicsStyle: 'Paper',
      boundaries: 'Plain',
      colors: 4,
      shallowDepth: 2,
      safetyDepth: 3,
      deepDepth: 6
    };
  }

  if (typeof settings.plugins === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (settings as any).plugins = {};
  }
  if (typeof settings.plugins.parameters === 'undefined') {
    settings.plugins.parameters = null;
  }

  if (typeof settings.resources === 'undefined') {
    settings.resources = {
      fetchFilter:
        '?position=[%map:longitude%,%map:latitude%]&distance=%fetch:radius%',
      fetchRadius: 0,
      notes: {
        rootFilter:
          '?position=[%map:longitude%,%map:latitude%]&distance=%note:radius%',
        getRadius: 20,
        groupNameEdit: false,
        groupRequiresPosition: false
      },
      video: {
        enable: false,
        url: ''
      },
      paths: []
    };
  } else {
    if (typeof settings.resources.video === 'undefined') {
      settings.resources.video = { enable: false, url: '' };
    }
    if (typeof settings.resources.paths === 'undefined') {
      settings.resources.paths = [];
    }
    if (typeof settings.resources.fetchFilter === 'undefined') {
      settings.resources.fetchFilter =
        '?position=[%map:longitude%,%map:latitude%]&distance=%fetch:radius%';
    }
    if (typeof settings.resources.fetchRadius === 'undefined') {
      settings.resources.fetchRadius = 0;
    }
  }

  // apply url params
  if (typeof hostParams.northup !== 'undefined') {
    settings.map.northUp = hostParams.northup === '0' ? false : true;
  }
  if (typeof hostParams.movemap !== 'undefined') {
    settings.map.moveMap = hostParams.movemap === '0' ? false : true;
  }
  if (hostParams.zoom) {
    try {
      const z = parseInt(hostParams.zoom as string);
      if (!isNaN(z)) {
        settings.map.zoomLevel = z > 28 ? 28 : z < 1 ? 1 : z;
      }
    } catch (error) {
      console.warn(
        `Invalid zoom level parameter (${hostParams.zoom} supplied!`
      );
    }
  }
}

// ** Default Configuration**
export const DefaultConfig: IAppConfig = {
  chartApi: 1, // set by feature detection
  experiments: false,
  version: '',
  darkMode: { enabled: false, source: 0 }, // source: 0= browser default, 1= Signal K mode, -1=manual)
  map: {
    // ** map config
    zoomLevel: 2,
    center: [0, 0],
    rotation: 0,
    moveMap: false,
    lockMoveMap: true,
    northUp: true,
    animate: false,
    limitZoom: false,
    invertColor: false
  },
  fixedLocationMode: false,
  fixedPosition: [0, 0],
  aisTargets: true, // display ais targets
  courseData: true, // show/hide course data
  toolBarButtons: true, // show/hide toolbar buttons
  notes: true, // display notes
  popoverMulti: false, // close popovers using cose button
  mapDoubleClick: false, // true=zoom
  muteSound: false,
  depthAlarm: { enabled: false, smoothing: 10000 },
  anchorRadius: 40, // most recent anchor radius setting
  plugins: {
    instruments: '/@signalk/instrumentpanel',
    startOnOpen: true,
    parameters: null
  },
  units: {
    // ** display units
    distance: 'm',
    depth: 'm',
    speed: 'kn',
    temperature: 'c'
  },
  selections: {
    // ** saved selections
    routes: [],
    waypoints: [],
    tracks: [],
    charts: ['openstreetmap', 'openseamap'],
    notes: [],
    chartOrder: [], // chart layer ordering
    headingAttribute: 'navigation.headingTrue',
    preferredPaths: {
      tws: 'environment.wind.speedTrue',
      twd: 'environment.wind.directionTrue',
      heading: 'navigation.courseOverGroundTrue',
      course: 'navigation.courseGreatCircle'
    },
    vessel: {
      trail: false, // display trail
      windVectors: true, // display vessel TWD, AWD vectors
      laylines: false,
      cogLine: 10, // self COG line time (mins)
      aisCogLine: 10, // ais COG line time (mins)
      headingLineSize: -1 // mode for display of heading line -1 = default
    },
    positionFormat: 'XY',
    aisTargets: null,
    aisTargetTypes: [],
    aisFilterByShipType: false,
    aisWindApparent: false,
    aisWindMinZoom: 15,
    aisShowTrack: false,
    aisMaxAge: 540000, // time since last update in ms (9 min)
    aisStaleAge: 360000, // time since last update in ms (6 min)
    aisProfile: 0, // ais display profile
    aisState: [], // list of ais state values used to filter targets
    notesMinZoom: 10,
    labelsMinZoom: 8,
    pluginFavourites: [],
    trailFromServer: false,
    trailDuration: 24, // number of hours of trail to fetch from server
    trailResolution: {
      // resolution of server trail at defined time horizons
      lastHour: '5s',
      next23: '1m',
      beyond24: '5m'
    },
    s57Options: {
      graphicsStyle: 'Paper',
      boundaries: 'Plain',
      colors: 4,
      shallowDepth: 2,
      safetyDepth: 3,
      deepDepth: 6
    },
    resourceSets: {}, // additional resources
    signalk: {
      // signal k connection options
      vessels: true,
      atons: true,
      aircraft: false,
      sar: false,
      meteo: true,
      maxRadius: 0, // max radius within which AIS targets are displayed
      proxied: true // server behind a proxy server
    },
    wakeLock: false,
    course: {
      autoNextPointOnArrival: false,
      autoNextPointDelay: 5000,
      autoNextPointTrigger: 'perpendicularPassed'
    }
  },
  resources: {
    // ** resource options
    fetchFilter:
      '?position=[%map:longitude%,%map:latitude%]&distance=%fetch:radius%',
    fetchRadius: 0, // radius (NM/km) within which to return resources
    notes: {
      rootFilter:
        '?position=[%map:longitude%,%map:latitude%]&distance=%note:radius%', // param string to provide record filtering
      getRadius: 20, // radius (NM/km) within which to return notes
      groupNameEdit: false,
      groupRequiresPosition: true
    },
    video: {
      enable: false,
      url: null
    },
    paths: []
  }
};

export interface IAppConfig {
  chartApi: number; // temp: use v{1|2}/api/resources/charts
  experiments: boolean;
  version: string;
  darkMode: { enabled: boolean; source: 0 | 1 | -1 }; // source: 0= browser default, 1= Signal K mode, -1=manual)
  map: {
    // ** map config
    zoomLevel: number;
    center: Position;
    rotation: number;
    moveMap: boolean;
    lockMoveMap: boolean;
    northUp: boolean;
    animate: boolean;
    limitZoom: boolean;
    invertColor: boolean;
  };
  fixedLocationMode: boolean;
  fixedPosition: Position;
  aisTargets: boolean; // display ais targets
  courseData: boolean; // show/hide course data
  toolBarButtons: boolean; // show/hide toolbar buttons
  notes: boolean; // display notes
  popoverMulti: boolean; // close popovers using cose button
  mapDoubleClick: boolean; // true=zoom
  muteSound: boolean;
  depthAlarm: { enabled: boolean; smoothing: number };
  anchorRadius: number; // most recent anchor radius setting
  plugins: {
    instruments: string;
    startOnOpen: boolean;
    parameters: string | null;
  };
  units: {
    // ** display units
    distance: 'm' | 'ft';
    depth: 'm' | 'ft';
    speed: 'kn' | 'msec' | 'kmh' | 'mph';
    temperature: 'c' | 'f';
  };
  selections: {
    // ** saved selections
    routes: string[];
    waypoints: string[];
    tracks: string[];
    charts: string[];
    notes: string[];
    chartOrder: string[]; // chart layer ordering
    headingAttribute: 'navigation.headingTrue' | 'navigation.headingMagnetic';
    preferredPaths: {
      tws: string;
      twd: string;
      heading: string;
      course: string;
    };
    vessel: {
      trail: boolean; // display trail
      windVectors: boolean; // display vessel TWD, AWD vectors
      laylines: boolean;
      cogLine: number; // (minutes) length = cogLine * sog
      aisCogLine: number; // (minutes) length = cogLine * sog
      headingLineSize: number; // mode for display of heading line -1 = default
    };
    positionFormat: 'XY' | 'SHDd' | 'HDd' | 'DMdH' | 'HDMS' | 'DHMS';
    aisTargets: string[];
    aisTargetTypes: number[];
    aisFilterByShipType: boolean;
    aisWindApparent: boolean;
    aisWindMinZoom: number;
    aisShowTrack: boolean;
    aisMaxAge: number; // time since last update in ms (9 min)
    aisStaleAge: number; // time since last update in ms (6 min)
    aisProfile: number; // ais display profile
    aisState: string[]; // list of ais state values used to filter targets
    notesMinZoom: number;
    labelsMinZoom: number;
    pluginFavourites: string[];
    trailFromServer: boolean;
    trailDuration: number; // number of hours of trail to fetch from server
    trailResolution: {
      // resolution of server trail at defined time horizons
      lastHour: string;
      next23: string;
      beyond24: string;
    };
    s57Options: {
      graphicsStyle: 'Simplified' | 'Paper';
      boundaries: 'Symbolized' | 'Plain';
      colors: 2 | 4;
      shallowDepth: number;
      safetyDepth: number;
      deepDepth: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resourceSets: { [key: string]: any }; // additional resources
    signalk: {
      // signal k connection options
      vessels: boolean;
      atons: boolean;
      aircraft: boolean;
      sar: boolean;
      meteo: boolean;
      maxRadius: number; // max radius within which AIS targets are displayed
      proxied: boolean; // server behind a proxy server
    };
    wakeLock: boolean;
    course: {
      autoNextPointOnArrival: boolean;
      autoNextPointDelay: number;
      autoNextPointTrigger: 'perpendicularPassed' | 'arrivalCircleEntered';
    };
  };
  resources: {
    // ** resource options
    fetchFilter: string; // param string to provide record filtering
    fetchRadius: number; // radius (NM/km) within which to return resources
    notes: {
      rootFilter: string; // param string to provide record filtering
      getRadius: number; // radius (NM/km) within which to return notes
      groupNameEdit: boolean;
      groupRequiresPosition: boolean;
    };
    video: {
      enable: boolean;
      url: string | null;
    };
    paths: string[];
  };
}

// ** process url tokens
export const processUrlTokens = (s: string, config: IAppConfig): string => {
  if (!s) {
    return s;
  }
  const ts = s.split('%');
  if (ts.length > 1) {
    const uts = ts.map((i) => {
      if (i === 'map:latitude') {
        return config.map.center[1];
      } else if (i === 'map:longitude') {
        return config.map.center[0];
      } else if (i === 'note:radius') {
        const dist =
          config.units.distance === 'm'
            ? config.resources.notes.getRadius
            : Math.floor(
                Convert.nauticalMilesToKm(config.resources.notes.getRadius)
              );
        return dist * 1000;
      } else if (i === 'fetch:radius') {
        const dist =
          config.units.distance === 'm'
            ? config.resources.notes.getRadius
            : Math.floor(
                Convert.nauticalMilesToKm(config.resources.fetchRadius)
              );
        return dist * 1000;
      } else {
        return i;
      }
    });
    s = uts.join('');
  }
  return s;
};
