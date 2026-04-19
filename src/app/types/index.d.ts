// ** Resource Types **

import { Position, LineString, MultiLineString } from './resources/geojson';

export type LineDash = 'solid' | 'short' | 'medium' | 'long';
export type LineLengthKind = 'pixels' | 'time' | 'distance';

/** How to interpret the line length value */
export interface ILineLengthDef {
  kind: LineLengthKind;
  value: number; // px | minutes | nmi
}

export interface ILineStyle {
  color: string;          // CSS / hex color
  width: number;          // line width in pixels
  dash: LineDash;         // named dash pattern
  lineLength?: ILineLengthDef; // only used for lines that have a configurable length
}

/** ILineStyle variant for lines that always carry a length definition. */
export interface ILineStyleWithLength extends ILineStyle {
  lineLength: ILineLengthDef;
}
import { FBCharts, FBRoute } from './resources/freeboard';
import {
  SKMeteo,
  SKSaR,
  SKAtoN,
  SKAircraft,
  SKVessel
} from '../modules/skresources/resource-classes';
import { DEPTH_UNIT } from '../lib/convert';
import { Options } from '../modules/map/ol/lib/charts/s57.service';

export * from './resources/signalk';
export * from './resources/custom';
export * from './resources/geojson';
export * from './resources/freeboard';
export * from './stream';

export type ErrorList = Array<{ status: number; message: string }>;

export type MFBAction = 'wpt' | 'pob' | 'autopilot' | 'radar';

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

export type TemperatureUnitDef = 'C' | 'F';
export type DepthUnitDef = 'm' | 'foot';
export type LengthUnitDef = 'm' | 'foot';
export type SpeedUnitDef = 'kn' | 'm/s' | 'km/h' | 'mph';
export type DistanceUnitDef = 'kilometer' | 'naut-mile';

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
    autoNightMode: boolean;
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
    distance: DistanceUnitDef;
    depth: DepthUnitDef;
    length: LengthUnitDef;
    speed: SpeedUnitDef;
    temperature: TemperatureUnitDef;
    positionFormat: 'XY' | 'SHDd' | 'HDd' | 'DMdH' | 'HDMS' | 'DHMS';
    headingAttribute: 'navigation.headingTrue' | 'navigation.headingMagnetic';
    preferredPaths: {
      tws: string;
      twd: string;
      heading: string;
      course: string;
    };
    useServerPrefs: boolean;
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
    overZoomTiles: boolean; // keep tiles visible beyond chart max zoom
    centerOffset: number; // vessel offset south of center (%)
    s57Options: Options; // S57 chart Options
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
    aisCogLine: number; // (minutes) length = cogLine * sog
    iconScale: number; // scale to apply to self Vessel icon
    rangeCircles: boolean; //display range circles
    rangeCirclesFixed: boolean; // use a fixed distance rather than zoom level calc
    rangeCirclesDistance: number; // distance between circles when fixed is true
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
    headingLineStyle: ILineStyleWithLength;  // style of self vessel heading line
    cogLineStyle: ILineStyleWithLength;      // style of self vessel COG line
    selfTrailStyle: ILineStyle;    // style of self vessel track line
    aisTrackStyle: ILineStyle;     // style of other vessel track lines
  };
  resources: {
    // ** resource options
    fetchFilter: string; // param string to provide record filtering
    fetchRadius: number; // radius (nmi/km) within which to return resources
    notes: {
      rootFilter: string; // param string to provide record filtering
      getRadius: number; // radius (nmi/km) within which to return notes
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
    regions: string[];
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

export interface SKServerUnitPrefs {
  name: string;
  categories: Record<string, SKUnitCategory | undefined>;
}

export type SKUnitCategory = {
  baseUnit: string;
  targetUnit: string;
  displayFormat: string;
  symbol: string;
};
