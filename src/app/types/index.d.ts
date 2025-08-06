// ** Resource Types **

import { Position, LineString, MultiLineString } from './resources/geojson';
import { FBCharts, FBRoute } from './resources/freeboard';
import {
  SKMeteo,
  SKSaR,
  SKAtoN,
  SKAircraft,
  SKVessel
} from '../modules/skresources/resource-classes';

export * from './resources/signalk';
export * from './resources/custom';
export * from './resources/geojson';
export * from './resources/freeboard';
export * from './stream';

export type ErrorList = Array<{ status: number; message: string }>;

export interface SKApiResponse {
  state: 'FAILED' | 'COMPLETED' | 'PENDING';
  statusCode: number;
  message: string;
  requestId?: string;
  href?: string;
  token?: string;
}

export interface IAppConfig {
  ui: {
    mapNorthUp: boolean;
    mapMove: boolean; // keep vessel centered
    mapConstrainZoom: boolean; // constrain zooming to map min / max values
    toolbarButtons: boolean; // show/hide toolbar buttons
    invertColor: boolean; // invert map feature label colors
  };
  chartApi: number; // temp: use v{1|2}/api/resources/charts
  experiments: boolean;
  version: string;
  darkMode: { enabled: boolean; source: 0 | 1 | -1 }; // source: 0= browser default, 1= Signal K mode, -1=manual)
  nightMode: boolean; // auto set night mode based on environment.mode
  map: {
    // ** map config
    zoomLevel: number;
    center: Position;
    rotation: number;
    lockMoveMap: boolean;
    animate: boolean;
  };
  fixedLocationMode: boolean;
  fixedPosition: Position;
  aisTargets: boolean; // display ais targets
  courseData: boolean; // show/hide course data
  notes: boolean; // display notes
  popoverMulti: boolean; // close popovers using cose button
  mapDoubleClick: boolean; // true=zoom
  muteSound: boolean;
  depthAlarm: { enabled: boolean; smoothing: number };
  anchorRadius: number; // most recent anchor radius setting
  anchorSetRadius: boolean; // checks inital anchor radius setting
  anchorManualSet: boolean; // checks manual set setting
  anchorRodeLength: number; // rode length setting
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
    tracks: string[] | null;
    charts: string[];
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
      iconScale: number; // scale to apply to self Vessel icon
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

export interface FBAppData {
  n2kRoute: FBRoute;
  loginRequired: boolean;
  hasWakeLock: boolean;
  chartBounds: {
    show: boolean;
    charts: FBCharts;
  };
  selfId: string;
  activeRoute: string;
  activeRouteReversed: boolean;
  activeRouteCircular: boolean;
  activeRouteIsEditing: boolean;
  editingId: string;
  activeWaypoint: string;
  trail: LineString; // self vessel track / trail
  serverTrail: boolean; // trail received from server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: { [key: string]: any }; // SK server info
  lastGet: Position; // map position of last resources GET
  map: {
    atClick: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features: any[];
      lonlat: Position;
    };
  };
  vessels: {
    // received vessel data
    showSelf: boolean;
    self: SKVessel;
    aisTargets: Map<string, SKVessel>;
    aisTracks: Map<string, MultiLineString>; // AIS targets track (tracks plugin)
    activeId: string;
    active: SKVessel;
    closest: string[];
    prefAvailablePaths: { [key: string]: string }; // preference paths available from source
    flagged: string[];
  };
  aircraft: Map<string, SKAircraft>; // received AIS aircraft data
  atons: Map<string, SKAtoN>; // received AIS AtoN data
  sar: Map<string, SKSaR>; // received AIS SaR data
  meteo: Map<string, SKMeteo>; // received AIS Meteo data
  aisMgr: {
    // manage aisTargets
    updateList: string[];
    staleList: string[];
    removeList: string[];
  };
  navData: {
    dtg: number;
    ttg: number;
    eta: Date;
    route: {
      dtg: number;
      ttg: number;
      eta: Date;
    };
    vmg: number;
    bearing: { value: number; type: string };
    bearingTrue: number;
    bearingMagnetic: number;
    xte: number;
    position: Position;
    pointIndex: number;
    pointTotal: number;
    arrivalCircle: number;
    startPosition: Position;
    pointNames: string[];
    activeRoutePoints: LineString;
    destPointName: string;
  };
  racing: {
    startLine: LineString;
  };
}
