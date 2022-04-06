import {
  PointFeature,
  LineStringFeature,
  PolygonFeature,
  MultiPolygonFeature
} from './geojson';

export type SKPosition = {
  latitude: number;
  longitude: number;
  altitude?: number;
};

export type Routes = { [id: string]: RouteResource };
export type Waypoints = { [id: string]: WaypointResource };
export type Regions = { [id: string]: RegionResource };
export type Notes = { [id: string]: NoteResource };
export type Charts = { [id: string]: ChartResource };

export interface RouteResource {
  name?: string | null;
  description?: string | null;
  distance?: number | null;
  feature: LineStringFeature;
}

export interface WaypointResource {
  name?: string | null;
  description?: string | null;
  feature: PointFeature;
}

export interface RegionResource {
  name?: string | null;
  description?: string | null;
  feature: PolygonFeature | MultiPolygonFeature;
}

export interface NoteResource {
  name?: string;
  description?: string;
  href?: string;
  position?: SKPosition;
  mimeType?: string;
  url?: string;
  // ca reports attributes
  group: string;
  authors: Array<unknown>;
  properties: { [key: string]: unknown };
  timestamp: string;
  source: string;
}

export interface ChartResource {
  name?: string;
  identifier?: string;
  description?: string;
  //v2
  url?: string;
  sourceType?: string;
  //v1
  tilemapUrl?: string;
  region?: string;
  scale?: number;
  chartLayers?: string[];
  bounds?: Array<number>;
  format?: string;
  minzoom?: number;
  maxzoom?: number;
  type?: string;
}
