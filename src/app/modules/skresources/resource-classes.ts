// **** RESOURCE CLASSES **********

import {
  LineStringFeature,
  PointFeature,
  PolygonFeature,
  MultiPolygonFeature,
  MultiLineStringFeature
} from 'src/app/types/resources/geojson';

import {
  SKPosition,
  RouteResource,
  WaypointResource,
  RegionResource,
  NoteResource,
  ChartResource
} from 'src/app/types/resources/signalk';

import { TrackResource } from 'src/app/types/resources/custom';

import { Position } from 'src/app/lib/geoutils';

// ** Signal K route class
export class SKRoute {
  name: string;
  description: string;
  distance = 0;
  feature: LineStringFeature;

  constructor(route?: RouteResource) {
    this.name = route?.name ? route.name : '';
    this.description = route?.description ? route.description : '';
    this.distance = route?.distance ? route.distance : 0;
    this.feature = route?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: []
      },
      properties: {},
      id: ''
    };
  }
}

// ** Signal K waypoint
export class SKWaypoint {
  name: string;
  description: string;
  feature: PointFeature;

  constructor(wpt?: WaypointResource) {
    this.name = wpt?.name ? wpt.name : '';
    this.description = wpt?.description ? wpt.description : '';
    this.feature = wpt?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {},
      id: ''
    };
  }
}

// ** Signal K Note
export class SKNote {
  name: string;
  description: string;
  position: SKPosition;
  href: string;
  mimeType: string;
  url: string;
  group: string;
  authors: Array<unknown>;
  properties: { [key: string]: unknown };

  constructor(note?: NoteResource) {
    this.name = note?.name ?? '';
    this.description = note?.description ?? '';
    this.position = note?.position ?? null;
    this.href = note?.href ?? null;
    this.mimeType = note?.mimeType ?? '';
    this.url = note?.url ?? '';
    // ca reports
    this.group = note?.group ?? null;
    this.authors =
      note?.authors && Array.isArray(note?.authors) ? note.authors : [];
    this.properties =
      note?.properties && typeof note?.properties === 'object'
        ? note.properties
        : {};
  }
}

// ** Signal K Region **
export class SKRegion {
  name: string;
  description: string;
  feature: PolygonFeature | MultiPolygonFeature;

  constructor(region?: RegionResource) {
    this.name = region?.name ? region.name : '';
    this.description = region?.description ? region.description : '';
    this.feature = region?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: []
      },
      properties: {},
      id: ''
    };
  }
}

// ** Signal K chart
export class SKChart {
  identifier: string;
  name: string;
  description: string;
  region: string;
  scale = 250000;
  layers: Array<string>;
  bounds: Array<number>;
  format: string;
  minZoom = 0;
  maxZoom = 24;
  type: string;
  url: string;

  constructor(chart?: ChartResource) {
    this.identifier = chart?.identifier ? chart.identifier : undefined;
    this.name = chart?.name ? chart.name : undefined;
    this.description = chart?.description ? chart.description : undefined;
    this.layers = chart?.layers ? chart.layers : [];
    this.bounds = chart?.bounds ? chart.bounds : undefined;
    this.format = chart?.format ? chart.format : undefined;
    this.minZoom =
      typeof chart?.minzoom !== 'undefined' ? chart.minzoom : this.minZoom;
    this.maxZoom =
      typeof chart?.maxzoom !== 'undefined' ? chart.maxzoom : this.maxZoom;
    this.type = chart?.type ? chart.type : undefined;
    this.url = chart?.url ? chart.url : undefined;
    this.scale =
      typeof chart?.scale !== 'undefined' && !isNaN(chart?.scale)
        ? chart.scale
        : this.scale;
    this.url = chart?.url ? chart.url : undefined;
  }
}

// ** Signal K Track
export class SKTrack {
  feature: MultiLineStringFeature;

  constructor(trk?: TrackResource) {
    this.feature = trk?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'MultiLineString',
        coordinates: []
      },
      properties: {},
      id: ''
    };
  }
}

// ** Vessel Data **
export class SKVessel {
  id: string;
  position: Position = [0, 0];
  heading: number;
  headingTrue: number = null;
  headingMagnetic: number = null;
  cog: number;
  cogTrue: number = null;
  cogMagnetic: number = null;
  sog: number;
  name: string;
  mmsi: string;
  callsign: string;
  state: string;
  wind = {
    direction: null,
    mwd: null,
    twd: null,
    tws: null,
    speedTrue: null,
    sog: null,
    awa: null,
    aws: null
  };
  lastUpdated = new Date();
  orientation = 0;
  buddy = false;
  closestApproach = null;
  mode = 'day';
  anchor = { maxRadius: null, radius: null, position: null };
  resourceUpdates = [];
  autopilot: { [key: string]: unknown } = {};
  track = [];
  courseApi = {
    activeRoute: {},
    nextPoint: {},
    previousPoint: {}
  };
  properties = {};
}

// ** AIS Base class **
class AISBase {
  id: string;
  lastUpdated = new Date();
  name: string;
  mmsi: string;
  position: Position = [0, 0];
  properties = {};
  state: string;
}

// ** AtoN class **
export class SKAtoN extends AISBase {
  type: { id: number; name: string } = { id: -1, name: '' };
  constructor() {
    super();
  }
}

// ** SaR class **
export class SKSaR extends SKAtoN {
  callsign: string;
  constructor() {
    super();
  }
}

// ** Aircraft Data **
export class SKAircraft extends AISBase {
  orientation = 0;
  sog = 0;
  callsign: string;
  track = [];
  constructor() {
    super();
  }
}
