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
  type?: string | null;
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
  bounds?: Array<number>;
  format?: string;
  minzoom?: number;
  maxzoom?: number;
  type?: string;
  scale?: number;
  url?: string;
  layers?: string[];
  $source?: string;
  //v1
  tilemapUrl?: string; // replaced by url
  chartLayers?: string[]; // replaced by layers
  serverType?: string; // replaced by type
}

export interface ChartProvider {
  identifier?: string;
  name: string;
  title?: string;
  description: string;
  type: 'tilejson' | 'WMS' | 'WMTS' | 'mapboxstyle';
  url: string;
  layers?: string[];
  bounds?: number[];
  minzoom?: number;
  maxzoom?: number;
  format?: string;
}
