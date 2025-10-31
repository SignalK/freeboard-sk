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

export type MFBAction = 'wpt' | 'pob' | 'autopilot';

export interface SKApiResponse {
  state: 'FAILED' | 'COMPLETED' | 'PENDING';
  statusCode: number;
  message: string;
  requestId?: string;
  href?: string;
  token?: string;
}

export interface CourseData {
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
}

export interface IAppConfig {
  ui: {
    mapNorthUp: boolean;
    mapMove: boolean; // keep vessel centered
    mapConstrainZoom: boolean; // constrain zooming to map min / max values
    toolbarButtons: boolean; // show/hide toolbar buttons
    invertColor: boolean; // invert map feature label colors
    showCourseData: boolean; // show/hide course data
    showAisTargets: boolean; // show/hide AIS targets
    showNotes: boolean; // show/hide notes
  };
  display: {
    fab: MFBAction; // FAB button selection
    disableWakelock: boolean;
    darkMode: { enabled: boolean; source: 0 | 1 | -1 }; // source: 0= browser default, 1= Signal K mode, -1=manual)
    nightMode: boolean; // auto set night mode based on environment.mode
    muteSound: boolean;
    depthAlarm: { enabled: boolean; smoothing: number };
    plugins: {
      instruments: string;
      startOnOpen: boolean;
      parameters: string | null;
      favourites: string[];
    };
  };
  units: {
    distance: 'm' | 'ft';
    depth: 'm' | 'ft';
    speed: 'kn' | 'msec' | 'kmh' | 'mph';
    temperature: 'c' | 'f';
    positionFormat: 'XY' | 'SHDd' | 'HDd' | 'DMdH' | 'HDMS' | 'DHMS';
    headingAttribute: 'navigation.headingTrue' | 'navigation.headingMagnetic';
    preferredPaths: {
      tws: string;
      twd: string;
      heading: string;
      course: string;
    };
  };
  map: {
    // ** map config
    zoomLevel: number;
    center: Position;
    rotation: number;
    lockMoveMap: boolean;
    animate: boolean;
    labelsMinZoom: number;
    doubleClickZoom: boolean; // true=zoom
    centerOffset: number; // vessel offset south of center (%)
    s57Options: {
      graphicsStyle: 'Simplified' | 'Paper';
      boundaries: 'Symbolized' | 'Plain';
      colors: 2 | 4;
      shallowDepth: number;
      safetyDepth: number;
      deepDepth: number;
      colorTable: number;
    };
    popoverMulti: boolean; // close popovers using cose button
  };
  course: {
    autoNextPointOnArrival: boolean;
    autoNextPointDelay: number;
    autoNextPointTrigger: 'perpendicularPassed' | 'arrivalCircleEntered';
    arrivalCircle: number;
  };
  vessels: {
    fixedLocationMode: boolean;
    fixedPosition: Position;
    trail: boolean; // display trail
    windVectors: boolean; // display vessel TWD, AWD vectors
    laylines: boolean;
    cogLine: number; // (minutes) length = cogLine * sog
    aisCogLine: number; // (minutes) length = cogLine * sog
    headingLineSize: number; // mode for display of heading line -1 = default
    iconScale: number; // scale to apply to self Vessel icon
    rangeCircles: boolean; //display range circles
    rangeCircleCount: number; // number of circles to display
    rangeCircleMinZoom: number; // min zoom level where they are displayed
    aisStaleAge: number; // time since last update in ms (6 min)
    aisMaxAge: number; // time since last update in ms (9 min)
    aisWindApparent: boolean;
    aisWindMinZoom: number;
    aisShowTrack: boolean;
    trailFromServer: boolean;
    trailDuration: number; // number of hours of trail to fetch from server
    trailResolution: {
      // resolution of server trail at defined time horizons
      lastHour: string;
      next23: string;
      beyond24: string;
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
      minZoom: number;
    };
    video: {
      enable: boolean;
      url: string | null;
    };
    paths: string[];
  };
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
  experiments: boolean;
  anchor: {
    radius: number; // most recent anchor radius setting
    setRadius: boolean; // checks inital anchor radius setting
    manualSet: boolean; // checks manual set setting
    rodeLength: number; // rode length setting
  };
  selections: {
    // ** saved selections
    routes: string[];
    waypoints: string[];
    tracks: string[] | null;
    charts: string[];
    chartOrder: string[]; // chart layer ordering
    aisTargets: string[];
    aisTargetTypes: number[];
    aisFilterByShipType: boolean;
    aisState: string[]; // list of ais state values used to filter targets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resourceSets: { [key: string]: any }; // additional resources
    infolayers: string[];
  };
}

export interface FBAppData {
  loginRequired: boolean;
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
  racing: {
    startLine: LineString;
  };
}
