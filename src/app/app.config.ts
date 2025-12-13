import { FBAppData, IAppConfig } from './types';
import { Convert } from './lib/convert';
import { SKVessel } from './modules';

// validate supplied settings against base config
export function validateConfig(settings: IAppConfig): boolean {
  let result = true;
  const skeys = Object.keys(settings);
  Object.keys(defaultConfig()).forEach((i) => {
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
  /** v2 formatting */
  if (typeof settings.ui === 'undefined') {
    settings.ui = {
      mapNorthUp: (settings as any).map.northUp ?? true,
      mapMove: (settings as any).map.moveMap ?? false,
      mapConstrainZoom: (settings as any).map.limitZoom ?? false,
      invertColor: (settings as any).map.invertColor ?? false,
      toolbarButtons: (settings as any).toolBarButtons ?? true,
      showCourseData: (settings as any).courseData ?? true,
      showAisTargets: (settings as any).aisTargets ?? true,
      showNotes: true
    };
  } else {
    if (typeof settings.ui.showCourseData === 'undefined') {
      settings.ui.showCourseData = (settings as any).courseData ?? true;
    }
    if (typeof settings.ui.showAisTargets === 'undefined') {
      settings.ui.showAisTargets = (settings as any).aisTargets ?? true;
    }
    if (typeof settings.ui.showNotes === 'undefined') {
      settings.ui.showNotes = true;
    }
  }

  if (typeof settings.display === 'undefined') {
    settings.display = {
      fab: 'wpt',
      disableWakelock: false,
      darkMode: (settings as any).darkMode ?? { enabled: false, source: 0 }, // source: 0= browser default, 1= Signal K mode, -1=manual)
      nightMode: (settings as any).nightMode ?? false, // auto set night mode based on environment.mode
      muteSound: (settings as any).muteSound ?? false,
      depthAlarm: (settings as any).depthAlarm ?? {
        enabled: false,
        smoothing: 10000
      },
      plugins: {
        instruments:
          (settings as any).plugins.instruments ?? '/@signalk/instrumentpanel',
        startOnOpen: (settings as any).plugins.startOnOpen ?? true,
        parameters: (settings as any).plugins.parameters ?? null,
        favourites: (settings as any).selections.pluginFavourites ?? []
      }
    };
  }

  if (typeof settings.map.s57Options === 'undefined') {
    settings.map.s57Options = {
      graphicsStyle:
        (settings as any).selections.s57Options.graphicsStyle ?? 'Paper',
      boundaries: (settings as any).selections.s57Options.boundaries ?? 'Plain',
      colors: (settings as any).selections.s57Options.colors ?? 4,
      shallowDepth: (settings as any).selections.s57Options.shallowDepth ?? 2,
      safetyDepth: (settings as any).selections.s57Options.safetyDepth ?? 3,
      deepDepth: (settings as any).selections.s57Options.deepDepth ?? 6,
      colorTable: 0
    };
  }
  if (typeof settings.map.labelsMinZoom === 'undefined') {
    settings.map.labelsMinZoom =
      (settings as any).selections.labelsMinZoom ?? 8;
  }
  if (typeof settings.map.lockMoveMap === 'undefined') {
    settings.map.lockMoveMap = false;
  }
  if (typeof settings.map.popoverMulti === 'undefined') {
    settings.map.popoverMulti = (settings as any).popoverMulti ?? false;
  }
  if (typeof settings.map.centerOffset === 'undefined') {
    settings.map.centerOffset = 0;
  }
  if (typeof settings.map.doubleClickZoom === 'undefined') {
    settings.map.doubleClickZoom = (settings as any).mapDoubleClick ?? false;
  }

  if (!settings.units.positionFormat) {
    settings.units.positionFormat =
      (settings as any).selections.positionFormat ?? 'XY';
  }
  if (typeof settings.units.headingAttribute === 'undefined') {
    settings.units.headingAttribute =
      (settings as any).selections.headingAttribute ?? 'navigation.headingTrue';
  }

  if (typeof settings.units.preferredPaths === 'undefined') {
    settings.units.preferredPaths = {
      tws: 'environment.wind.speedTrue',
      twd: 'environment.wind.directionTrue',
      heading: 'navigation.courseOverGroundTrue',
      course: 'navigation.courseGreatCircle'
    };
  }

  if (typeof settings.course === 'undefined') {
    settings.course = (settings as any).selections.course ?? {
      autoNextPointOnArrival: false,
      autoNextPointDelay: 5000,
      autoNextPointTrigger: 'perpendicularPassed',
      arrivalCircle: 100
    };
  } else {
    if (typeof settings.course.arrivalCircle === 'undefined') {
      settings.course.arrivalCircle = 100;
    }
  }

  if (typeof settings.vessels === 'undefined') {
    settings.vessels = {
      fixedLocationMode: (settings as any).fixedLocationMode ?? false,
      fixedPosition: (settings as any).fixedPosition ?? [0, 0],
      trail: (settings as any).selections.vessel.trail ?? true,
      windVectors: (settings as any).selections.vessel.windVectors ?? true,
      laylines: (settings as any).selections.vessel.laylines ?? false,
      cogLine: (settings as any).selections.vessel.cogLine ?? 10,
      aisCogLine: (settings as any).selections.vessel.aisCogLine ?? 10,
      headingLineSize:
        (settings as any).selections.vessel.headingLineSize ?? -1,
      iconScale: (settings as any).selections.vessel.iconScale ?? 0.9,
      rangeCircles: false,
      rangeCircleCount: 4,
      rangeCircleMinZoom: 8,
      aisStaleAge: (settings as any).selections.aisStaleAge ?? 360000,
      aisMaxAge: (settings as any).selections.aisMaxAge ?? 540000,
      aisWindApparent: (settings as any).selections.aisWindApparent ?? false,
      aisWindMinZoom: (settings as any).selections.aisWindMinZoom ?? 15,
      aisShowTrack: (settings as any).selections.aisShowTrack ?? false,
      trailFromServer: (settings as any).selections.trailFromServer ?? false,
      trailDuration: (settings as any).selections.trailDuration ?? 24,
      trailResolution: (settings as any).selections.trailResolution ?? {
        lastHour: '5s',
        next23: '1m',
        beyond24: '5m'
      }
    };
  } else {
    if (typeof settings.vessels.rangeCircleCount === 'undefined') {
      settings.vessels.rangeCircleCount = 4;
    }
    if (typeof settings.vessels.rangeCircleMinZoom === 'undefined') {
      settings.vessels.rangeCircleMinZoom = 8;
    }
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
        groupRequiresPosition: false,
        minZoom: 10
      },
      video: {
        enable: false,
        url: ''
      },
      paths: []
    };
  } else {
    if (typeof settings.resources.notes.minZoom === 'undefined') {
      settings.resources.notes.minZoom =
        (settings as any).selections.notesMinZoom ?? 10;
    }
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

  if (typeof settings.signalk === 'undefined') {
    settings.signalk = (settings as any).selections.signalk ?? {
      vessels: true,
      atons: true,
      aircraft: false,
      sar: false,
      meteo: true,
      maxRadius: 0,
      proxied: true
    };
  } else {
    // force proxied = true for stored config.
    settings.signalk.proxied = true;
  }

  if (typeof settings.anchor === 'undefined') {
    settings.anchor = {
      radius: (settings as any).anchorRadius ?? 40,
      setRadius: (settings as any).anchorSetRadius ?? false,
      manualSet: (settings as any).anchorManualSet ?? false,
      rodeLength: (settings as any).anchorRodeLength ?? 50
    };
  }

  /**
   * v2 deprecations
   * @todo For removal (Applied 2.17.0)
   */
  delete (settings as any).anchorRadius;
  delete (settings as any).anchorSetRadius;
  delete (settings as any).anchorManualSet;
  delete (settings as any).anchorRodeLength;
  delete (settings as any).courseData;
  delete (settings as any).selections.s57Options;
  delete (settings as any).popoverMulti;
  delete (settings as any).mapDoubleClick;
  delete (settings as any).darkMode;
  delete (settings as any).nightMode;
  delete (settings as any).muteSound;
  delete (settings as any).depthAlarm;
  delete (settings as any).plugins;
  delete (settings as any).notes;
  delete (settings as any).aisTargets;
  delete (settings as any).selections.notesMinZoom;
  delete (settings as any).selections.signalk;
  delete (settings as any).fixedLocationMode;
  delete (settings as any).fixedPosition;
  delete (settings as any).selections.labelsMinZoom;
  delete (settings as any).selections.positionFormat;
  delete (settings as any).selections.headingAttribute;
  delete (settings as any).selections.preferredPaths;
  delete (settings as any).selections.pluginFavourites;
  delete (settings as any).selections.course;
  delete (settings as any).selections.aisStaleAge;
  delete (settings as any).selections.aisMaxAge;
  delete (settings as any).selections.aisWindApparent;
  delete (settings as any).selections.aisWindMinZoom;
  delete (settings as any).selections.aisShowTrack;
  delete (settings as any).selections.vessel;
  delete (settings as any).selections.trailFromServer;
  delete (settings as any).selections.trailDuration;
  delete (settings as any).selections.trailResolution;

  /**
   * v2 deprecations
   * @todo For removal (Applied 2.16.1)
   */
  delete (settings as any).map.northUp;
  delete (settings as any).map.moveMap;
  delete (settings as any).map.limitZoom;
  delete (settings as any).map.invertColor;
  delete (settings as any).toolBarButtons;
  delete (settings as any).selections.wakeLock;

  /**
   *  Remove notes selections
   * @todo For removal (Applied 2.14.2)
   */
  delete (settings as any).selections.notes;

  // ************************************************

  if (typeof settings.selections === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (settings as any).selections = {};
  }

  if (typeof settings.selections.aisTargetTypes === 'undefined') {
    settings.selections.aisTargetTypes = [];
  }
  if (typeof settings.selections.aisFilterByShipType === 'undefined') {
    settings.selections.aisFilterByShipType = false;
  }
  if (typeof settings.selections.aisState === 'undefined') {
    settings.selections.aisState = [];
  }

  if (typeof settings.selections.chartOrder === 'undefined') {
    settings.selections.chartOrder = [];
  }
  if (typeof settings.selections.tracks === 'undefined') {
    settings.selections.tracks = [];
  }
  if (typeof settings.selections.resourceSets === 'undefined') {
    settings.selections.resourceSets = {};
  }
  if (typeof settings.selections.infolayers === 'undefined') {
    settings.selections.infolayers = [];
  }
  if (typeof settings.selections.regions === 'undefined') {
    settings.selections.regions = [];
  }

  if (typeof settings.units.temperature === 'undefined') {
    settings.units.temperature = 'c';
  }

  // apply url params
  if (typeof hostParams.northup !== 'undefined') {
    settings.ui.mapNorthUp = hostParams.northup === '0' ? false : true;
  }
  if (typeof hostParams.movemap !== 'undefined') {
    settings.ui.mapMove = hostParams.movemap === '0' ? false : true;
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

// initialise default configuration
export function defaultConfig(): IAppConfig {
  return {
    ui: {
      mapNorthUp: true,
      mapMove: false,
      mapConstrainZoom: false,
      toolbarButtons: true,
      invertColor: false, // invert map feature label colors
      showCourseData: true, // show/hide course data
      showAisTargets: true, // show/hide ais targets
      showNotes: true // show/hide notes
    },
    display: {
      fab: 'wpt', // default FAB button
      disableWakelock: false,
      darkMode: { enabled: false, source: 0 }, // source: 0= browser default, 1= Signal K mode, -1=manual)
      nightMode: false, // auto set night mode based on environment.mode
      muteSound: false,
      depthAlarm: { enabled: false, smoothing: 10000 },
      plugins: {
        instruments: '/@signalk/instrumentpanel',
        startOnOpen: true,
        parameters: null,
        favourites: []
      }
    },
    units: {
      distance: 'm',
      depth: 'm',
      speed: 'kn',
      temperature: 'c',
      positionFormat: 'XY',
      headingAttribute: 'navigation.headingTrue',
      preferredPaths: {
        tws: 'environment.wind.speedTrue',
        twd: 'environment.wind.directionTrue',
        heading: 'navigation.courseOverGroundTrue',
        course: 'navigation.courseGreatCircle'
      }
    },
    map: {
      // ** map config
      zoomLevel: 2,
      center: [0, 0],
      rotation: 0,
      lockMoveMap: true,
      animate: false,
      labelsMinZoom: 8,
      doubleClickZoom: false, // true=zoom
      centerOffset: 0,
      s57Options: {
        graphicsStyle: 'Paper',
        boundaries: 'Plain',
        colors: 4,
        shallowDepth: 2,
        safetyDepth: 3,
        deepDepth: 6,
        colorTable: 0
      },
      popoverMulti: false // close popovers using cose button
    },
    course: {
      autoNextPointOnArrival: false,
      autoNextPointDelay: 5000,
      autoNextPointTrigger: 'perpendicularPassed',
      arrivalCircle: 100
    },
    vessels: {
      fixedLocationMode: false,
      fixedPosition: [0, 0],
      trail: false, // display trail
      windVectors: true, // display vessel TWD, AWD vectors
      laylines: false,
      cogLine: 10, // self COG line time (mins)
      aisCogLine: 10, // ais COG line time (mins)
      headingLineSize: -1, // mode for display of heading line -1 = default
      iconScale: 0.9,
      rangeCircles: false,
      rangeCircleCount: 4,
      rangeCircleMinZoom: 8,
      aisStaleAge: 360000, // time since last update in ms (6 min)
      aisMaxAge: 540000, // time since last update in ms (9 min)
      aisWindApparent: false,
      aisWindMinZoom: 15,
      aisShowTrack: false,
      trailFromServer: false,
      trailDuration: 24, // number of hours of trail to fetch from server
      trailResolution: {
        // resolution of server trail at defined time horizons
        lastHour: '5s',
        next23: '1m',
        beyond24: '5m'
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
        groupRequiresPosition: true,
        minZoom: 10
      },
      video: {
        enable: false,
        url: null
      },
      paths: []
    },
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
    anchor: {
      radius: 40, // most recent anchor radius setting
      setRadius: false,
      manualSet: false, // checks manual set setting
      rodeLength: 50 // rode length setting
    },
    experiments: false,
    selections: {
      routes: [],
      waypoints: [],
      regions: [],
      tracks: null,
      charts: ['openstreetmap', 'openseamap'],
      chartOrder: ['openstreetmap', 'openseamap'], // chart layer ordering
      aisTargets: null,
      aisTargetTypes: [],
      aisFilterByShipType: false,
      aisState: [], // list of ais state values used to filter targets
      resourceSets: {}, // additional resources
      infolayers: null
    }
  };
}

// initialise state data
export function initData(): FBAppData {
  return {
    loginRequired: false,
    chartBounds: {
      show: false,
      charts: []
    },
    selfId: null,
    activeRoute: null,
    activeRouteReversed: false,
    activeRouteCircular: false,
    activeRouteIsEditing: false,
    editingId: null,
    activeWaypoint: null,
    serverTrail: false, // trail received from server
    server: null,
    lastGet: null, // map position of last resources GET
    map: {
      atClick: {
        features: [],
        lonlat: [0, 0]
      }
    },
    vessels: {
      // received vessel data
      showSelf: false,
      self: new SKVessel(),
      aisTargets: new Map(),
      aisTracks: new Map(), // AIS targets track (tracks plugin)
      activeId: null,
      active: null,
      closest: [],
      prefAvailablePaths: {}, // preference paths available from source,
      flagged: [] // flagged ais targets
    },
    aircraft: new Map(), // received AIS aircraft data
    atons: new Map(), // received AIS AtoN data
    sar: new Map(), // received AIS SaR data
    meteo: new Map(), // received AIS Meteo data
    racing: {
      startLine: []
    }
  };
}

// process url tokens from settings
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
      } else if (i === 'map:zoom') {
        return Math.floor(config.map.zoomLevel);
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
