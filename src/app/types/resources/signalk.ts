import {
  PointFeature,
  LineStringFeature,
  PolygonFeature,
  MultiPolygonFeature
} from './geojson';
import { ActionResult } from '../stream';

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
  // v2 start / end hrefs; dropped on transform (the points carry them)
  start?: string;
  end?: string;
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
  group?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authors?: Array<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: { [key: string]: any };
  timestamp?: string;
  source?: string;
}

/**
 * Response to a resource PUT / POST. A POST also carries the id the server
 * assigned to the new resource.
 */
export interface ResourceActionResult extends ActionResult {
  id?: string;
}

/**
 * Per-chart image adjustment applied to raster/aerial tile layers. Values are
 * multipliers where `1` is neutral (unchanged); `0` is black / fully grey.
 */
export interface ChartImageAdjustment {
  brightness: number;
  contrast: number;
}

/**
 * Time dimension of a time-varying chart (weather radar, satellite, nowcast),
 * as declared on the chart resource by its provider — see the *Time-varying
 * charts* chart-resource convention in `docs/api/plotter-extensions-api.md`.
 * All instants are ISO 8601 strings.
 */
export interface ChartTimeDimension {
  // Tile URL template carrying a `{time}` placeholder, replaced with the
  // URL-encoded instant. Required for tilelayer / tileJSON sources; omitted for
  // WMS / WMTS, which take the instant through the standard TIME parameter /
  // Time dimension instead.
  url?: string;
  // True when the source serves a live / latest frame, so "live" (no instant)
  // is a valid target. A purely archival source sets false and is started at
  // its last frame.
  current: boolean;
  // Best-effort timeline metadata: a regular range …
  from?: string;
  to?: string;
  step?: number; // ms between frames
  // … or the explicit instants offered.
  values?: string[];
}

/**
 * A chart's playback loop as remembered between sessions: how far before the
 * newest frame it starts and ends, in milliseconds (`end` is 0 for "up to the
 * newest frame"). Offsets rather than instants, since the frames themselves
 * roll on.
 */
export interface ChartTimeLoopOffsets {
  start: number;
  end: number;
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
  tileSize?: number;
  defaultOpacity?: number;
  // Auto-refresh cadence in milliseconds for a time-varying raster chart
  // (weather radar, satellite). When set, the chart's tile source is refreshed
  // non-destructively on this interval (clamped to a 60 s minimum). Absent or 0
  // means the chart never auto-refreshes. Raster types only (tilelayer / XYZ,
  // tileJSON, WMS, WMTS); ignored for mapstyleJSON.
  refreshInterval?: number;
  // Time dimension of a time-varying chart. Absent means the chart is a single
  // static image (or the provider does not expose its frames).
  time?: ChartTimeDimension;
  imageAdjustment?: ChartImageAdjustment;
  // Lowest zoom level the chart is drawn at, as a local display preference.
  // Distinct from the declared `minzoom`, which describes the tiles that exist.
  displayMinZoom?: number;
  proxy?: boolean;
  $source?: string;
  style?: string;
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
  type: 'tileJSON' | 'WMS' | 'WMTS' | 'mapstyleJSON';
  url: string;
  layers?: string[];
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
  format?: string;
  defaultOpacity?: number;
  time?: ChartTimeDimension;
}
