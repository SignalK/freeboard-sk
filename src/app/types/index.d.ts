// ** Resource Types **

import { Position, LineString, MultiLineString } from './resources/geojson';
import {
  FBCharts,
  FBNotes,
  FBRoute,
  FBRoutes,
  FBWaypoints
} from './resources/freeboard';
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

export interface PluginInfo {
  enabled: boolean;
  enabledByDefault: boolean;
  id: string;
  name: string;
  version: string;
}

export interface PluginSettings {
  version: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: { [key: string]: any };
}

export interface AppUpdateMessage {
  result: 'update' | 'new';
  previous: string;
  new: string;
}

export interface FBAppData {
  firstRun: boolean;
  updatedRun: AppUpdateMessage;
  kioskMode: boolean;
  n2kRoute: FBRoute;
  optAppPanel: boolean;
  trueMagChoice: string;
  loggedIn: boolean;
  loginRequired: boolean;
  loggedInBadgeText: string;
  hasToken: boolean;
  hasWakeLock: boolean;
  routes: FBRoutes;
  waypoints: FBWaypoints;
  charts: FBCharts;
  chartBounds: boolean;
  notes: FBNotes;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resourceSets: { [key: string]: any }; // additional resource sets
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
    suppressContextMenu: boolean;
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
    vmg: number;
    dtg: number;
    ttg: number;
    bearing: { value: number; type: string };
    bearingTrue: number;
    bearingMagnetic: number;
    xte: number;
    eta: Date;
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
    finishLine: LineString;
  };
  anchor: {
    hasApi: boolean;
  };
  autopilot: {
    console: boolean; // display Autopilot console
    hasApi: boolean; // Server implements Autopilot API
  };
  buddyList: {
    hasApi: boolean; // Server has buddy list plugin
  };
  skIcons: {
    hasApi: boolean; // Server implements SignalK Icon resources endpoint
  };
  buildRoute: {
    show: boolean;
  };
  weather: {
    hasApi: boolean;
  };
  measurement: {
    coords: Array<Position>;
    index: number;
  };
}
