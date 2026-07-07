import { FBAppData, IAppConfig, TemperatureUnitDef } from './types';
import { Convert } from './lib/convert';
import { SKVessel } from './modules';
import { DefaultOptions } from './modules/map/ol/lib/charts/s57.service';

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
      mapNorthUp: true,
      mapMove: false,
      mapConstrainZoom: false,
      invertColor: false,
      toolbarButtons: true,
      showCourseData: true,
      showAisTargets: true,
      showNotes: true,
      autoNightMode: false
    };
  } else {
    if (typeof settings.ui.showCourseData === 'undefined') {
      settings.ui.showCourseData = true;
    }
    if (typeof settings.ui.showAisTargets === 'undefined') {
      settings.ui.showAisTargets = true;
    }
    if (typeof settings.ui.showNotes === 'undefined') {
      settings.ui.showNotes = true;
    }
  }

  if (typeof settings.display === 'undefined') {
    settings.display = {
      fab: 'wpt',
      disableWakelock: false,
      darkMode: { enabled: false, source: 0 }, // source: 0= browser default, 1= Signal K mode, -1=manual)
      nightMode: false, // auto set night mode based on environment.mode
      muteSound: false,
      depthAlarm: {
        enabled: false,
        smoothing: 10000
      },
      plugins: {
        instruments: '/@signalk/instrumentpanel',
        startOnOpen: true,
        parameters: null,
        favourites: []
      },
      preferInfoPanel: true,
      statusBar: {
        liveEta: false,
        referenceSpeed: 6
      }
    };
  } else {
    if (typeof settings.display.preferInfoPanel === 'undefined') {
      settings.display.preferInfoPanel = true;
    }
    if (typeof settings.display.statusBar === 'undefined') {
      settings.display.statusBar = {
        liveEta: false,
        referenceSpeed: 6
      };
    }
  }

  if (typeof settings.units.temperature === 'undefined') {
    settings.units.temperature = 'C';
  }
  settings.units.temperature =
    settings.units.temperature.toUpperCase() as TemperatureUnitDef;
  settings.units.depth =
    (settings.units.depth as any) === 'ft' ? 'foot' : settings.units.depth;
  if (typeof settings.units.length === 'undefined') {
    settings.units.length = settings.units.depth ?? 'm';
  }
  settings.units.speed =
    (settings.units.speed as any) === 'msec'
      ? 'm/s'
      : (settings.units.speed as any) === 'kmh'
        ? 'km/h'
        : settings.units.speed;
  settings.units.distance =
    (settings.units.distance as any) === 'm'
      ? 'kilometer'
      : (settings.units.distance as any) === 'ft'
        ? 'naut-mile'
        : settings.units.distance;

  if (typeof settings.map.s57Options === 'undefined') {
    settings.map.s57Options = {
      graphicsStyle: 'Paper',
      boundaries: 'Plain',
      colors: 4,
      shallowDepth: 2,
      safetyDepth: 3,
      deepDepth: 6,
      colorTable: 0,
      otherLayers: DefaultOptions.otherLayers,
      depthUnit: settings.units.depth ?? 'm'
    };
  } else {
    if (typeof settings.map.s57Options.otherLayers === 'undefined') {
      settings.map.s57Options.otherLayers = DefaultOptions.otherLayers;
    }
    if (typeof settings.map.s57Options.depthUnit === 'undefined') {
      settings.map.s57Options.depthUnit = settings.units.depth ?? 'm';
    }
  }

  if (typeof settings.map.labelsMinZoom === 'undefined') {
    settings.map.labelsMinZoom = 8;
  }
  if (typeof settings.map.lockMoveMap === 'undefined') {
    settings.map.lockMoveMap = false;
  }
  if (typeof settings.map.popoverMulti === 'undefined') {
    settings.map.popoverMulti = false;
  }
  if (typeof settings.map.centerOffset === 'undefined') {
    settings.map.centerOffset = 0;
  }
  if (typeof settings.map.doubleClickZoom === 'undefined') {
    settings.map.doubleClickZoom = false;
  }
  if (typeof settings.map.overZoomTiles === 'undefined') {
    settings.map.overZoomTiles = true;
  }

  if (!settings.units.positionFormat) {
    settings.units.positionFormat = 'XY';
  }
  if (typeof settings.units.headingAttribute === 'undefined') {
    settings.units.headingAttribute = 'navigation.headingTrue';
  }
  if (typeof settings.units.preferredPaths === 'undefined') {
    settings.units.preferredPaths = {
      tws: 'environment.wind.speedTrue',
      twd: 'environment.wind.directionTrue',
      heading: 'navigation.courseOverGroundTrue',
      course: 'navigation.courseGreatCircle'
    };
  }
  if (typeof settings.units.useServerPrefs === 'undefined') {
    settings.units.useServerPrefs = false;
  }

  if (typeof settings.course === 'undefined') {
    settings.course = {
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
      fixedLocationMode: false,
      fixedPosition: [0, 0],
      trail: true,
      windVectors: true,
      laylines: false,
      selfLines: {
        cog: {
          length: 10, // (minutes) length = cogLine * sog
          color: 'rgba(204, 12, 225, 0.7)',
          weight: 1,
          dash: 'none'
        },
        heading: {
          length: -1, // mode for display of heading line -1 = default
          color: 'rgba(221, 99, 0, 0.5)',
          weight: 4,
          dash: 'none'
        }
      },
      aisCogLine: 10,
      iconScale: 0.9,
      rangeCircles: false,
      rangeCirclesFixed: false,
      rangeCirclesDistance: 1000,
      rangeCircleCount: 4,
      rangeCircleMinZoom: 8,
      aisStaleAge: 360000,
      aisMaxAge: 540000,
      aisWindApparent: false,
      aisWindMinZoom: 15,
      aisShowTrack: false,
      trailFromServer: false,
      trailDuration: 24,
      trailResolution: {
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
    if (typeof settings.vessels.rangeCirclesFixed === 'undefined') {
      settings.vessels.rangeCirclesFixed = false;
    }
    if (typeof settings.vessels.rangeCirclesDistance === 'undefined') {
      settings.vessels.rangeCirclesDistance = 1000;
    }
    if (typeof settings.vessels.selfLines === 'undefined') {
      settings.vessels.selfLines = {
        cog: {
          length: (settings as any).vessels.cogLine ?? 10,
          color: 'rgba(204, 12, 225, 0.7)',
          weight: 1,
          dash: 'none'
        },
        heading: {
          length: (settings as any).vessels.headingLineSize ?? -1,
          color: 'rgba(221, 99, 0, 0.5)',
          weight: 4,
          dash: 'none'
        }
      };
      // @todo remove (implemented) v2.22.2
      delete (settings as any).vessels.cogLine;
      delete (settings as any).vessels.headingLineSize;
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
      settings.resources.notes.minZoom = 10;
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
    settings.signalk = {
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
      radius: 40,
      setRadius: false,
      manualSet: false,
      rodeLength: 50
    };
  }

  if (
    !settings.plotterExtensions ||
    typeof settings.plotterExtensions !== 'object' ||
    Array.isArray(settings.plotterExtensions)
  ) {
    settings.plotterExtensions = {
      widgets: []
    };
  }
  // migrate early plotterExtensions config shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (settings.plotterExtensions as any).enabled;
  if (!Array.isArray(settings.plotterExtensions.widgets)) {
    settings.plotterExtensions.widgets = [];
  }
  settings.plotterExtensions.widgets = settings.plotterExtensions.widgets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((w: any) => {
      // early builds used `corner` with a `tl` option
      if (w.corner && !w.anchor) {
        w.anchor = w.corner === 'tl' ? 'tr' : w.corner;
        delete w.corner;
      }
      return w;
    })
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (w: any) => ['tr', 'ct', 'cb', 'bl', 'br'].includes(w.anchor)
    );

  if (typeof settings.radars === 'undefined') {
    settings.radars = {
      deviceId: '',
      opacity: 1
    };
  } else {
    if (typeof settings.radars.opacity === 'undefined') {
      settings.radars.opacity = 1;
    }
  }

  // ************************************************

  if (typeof settings.selections === 'undefined') {
    settings.selections = {
      routes: [],
      waypoints: [],
      regions: [],
      tracks: null,
      charts: ['openstreetmap', 'openseamap'],
      chartOrder: ['openstreetmap', 'openseamap'],
      chartOpacity: {},
      chartImageAdjustment: {},
      aisTargets: null,
      aisTargetTypes: [],
      aisFilterByShipType: false,
      aisState: [],
      resourceSets: {},
      infolayers: null,
      weatherWindEnabled: false,
      oceanCurrentsEnabled: false
    };
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
  if (typeof settings.selections.chartOpacity === 'undefined') {
    settings.selections.chartOpacity = {};
  }
  if (typeof settings.selections.chartImageAdjustment === 'undefined') {
    settings.selections.chartImageAdjustment = {};
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
  if (typeof settings.selections.weatherWindEnabled === 'undefined') {
    settings.selections.weatherWindEnabled = false;
  }
  if (typeof settings.selections.oceanCurrentsEnabled === 'undefined') {
    settings.selections.oceanCurrentsEnabled = false;
  }

  // ensure legacy notes selections section is removed
  if (typeof (settings as any).selections.notes) {
    delete (settings as any).selections.notes;
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
      showNotes: true, // show/hide notes
      autoNightMode: false
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
      },
      preferInfoPanel: true,
      statusBar: {
        liveEta: false,
        referenceSpeed: 6
      }
    },
    units: {
      distance: 'kilometer',
      depth: 'm',
      length: 'm',
      speed: 'kn',
      temperature: 'C',
      positionFormat: 'XY',
      headingAttribute: 'navigation.headingTrue',
      preferredPaths: {
        tws: 'environment.wind.speedTrue',
        twd: 'environment.wind.directionTrue',
        heading: 'navigation.courseOverGroundTrue',
        course: 'navigation.courseGreatCircle'
      },
      useServerPrefs: false
    },
    map: {
      zoomLevel: 2,
      center: [0, 0],
      rotation: 0,
      lockMoveMap: true,
      animate: false,
      labelsMinZoom: 8,
      doubleClickZoom: false, // true=zoom
      overZoomTiles: true, // keep tiles visible beyond chart max zoom
      centerOffset: 0,
      s57Options: {
        graphicsStyle: 'Paper',
        boundaries: 'Plain',
        colors: 4,
        shallowDepth: 2,
        safetyDepth: 3,
        deepDepth: 6,
        colorTable: 0,
        otherLayers: DefaultOptions.otherLayers,
        depthUnit: 'm'
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
      selfLines: {
        cog: {
          length: 10, // (minutes) length = cogLine * sog
          color: 'rgba(204, 12, 225, 0.7)',
          weight: 1,
          dash: 'none'
        },
        heading: {
          length: -1, // mode for display of heading line -1 = default
          color: 'rgba(221, 99, 0, 0.5)',
          weight: 4,
          dash: 'none'
        }
      },
      aisCogLine: 10, // ais COG line time (mins)
      iconScale: 0.9,
      rangeCircles: false,
      rangeCirclesFixed: false,
      rangeCirclesDistance: 1000, // distance in m
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
      fetchRadius: 0, // radius (nmi/km) within which to return resources
      notes: {
        rootFilter:
          '?position=[%map:longitude%,%map:latitude%]&distance=%note:radius%', // param string to provide record filtering
        getRadius: 20, // radius (nmi/km) within which to return notes
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
    radars: {
      deviceId: undefined,
      opacity: 1
    },
    experiments: false,
    plotterExtensions: {
      widgets: []
    },
    selections: {
      routes: [],
      waypoints: [],
      regions: [],
      tracks: null,
      charts: ['openstreetmap', 'openseamap'],
      chartOrder: ['openstreetmap', 'openseamap'], // chart layer ordering
      chartOpacity: {},
      chartImageAdjustment: {},
      aisTargets: null,
      aisTargetTypes: [],
      aisFilterByShipType: false,
      aisState: [], // list of ais state values used to filter targets
      resourceSets: {}, // additional resources
      infolayers: null,
      weatherWindEnabled: false,
      oceanCurrentsEnabled: false
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
      flagged: [], // flagged ais targets
      showTrack: [] // ais targets to display track for (session-only)
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
          config.units.distance === 'kilometer'
            ? config.resources.notes.getRadius
            : Math.floor(
                Convert.nauticalMilesToKm(config.resources.notes.getRadius)
              );
        return dist * 1000;
      } else if (i === 'fetch:radius') {
        const dist =
          config.units.distance === 'kilometer'
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
