import type {
  ChartResource as SKChartResource,
  NoteResource as SKNoteResource,
  RegionResource as SKRegionResource,
  RouteResource as SKRouteResource,
  WaypointResource as SKWaypointResource
} from '@signalk/server-api/typebox';
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

/**
 * The server's resource schemas list a feature's geometry and properties only.
 * On the wire it is a whole GeoJSON Feature (RFC 7946 §3.2), so it also has
 * `type` and may have an `id`.
 */
type WithGeoJsonFeature<R extends { feature: object }> = Omit<R, 'feature'> & {
  feature: R['feature'] & { type: 'Feature'; id?: string };
};

export type RouteResource = WithGeoJsonFeature<SKRouteResource>;
export type WaypointResource = WithGeoJsonFeature<SKWaypointResource>;
export type RegionResource = WithGeoJsonFeature<SKRegionResource>;

/**
 * A note as the server lists it. The schema calls the title `title`, but
 * Freeboard and note providers such as signalk-activecaptain-resources write
 * `name`; the read path turns a `title` into the name.
 */
export type NoteResource = SKNoteResource & {
  name?: string;
  // ca reports attributes
  group?: string;
  authors?: Array<{ name?: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: { [key: string]: any };
  // when the note was last modified, as the server lists it
  timestamp?: string;
};

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
  // True when the frames are a forecast: every one from `from` to `to` (or
  // every listed value) exists already, the ones ahead of now included. Without
  // it, frames after now are taken as not there yet (a rolling product whose
  // declared `to` runs ahead of the present).
  forecast?: boolean;
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

/**
 * A chart as the server lists it. `type` and `format` stay plain strings:
 * Freeboard matches both case-insensitively, accepts formats the schema does
 * not list (`mvt`), and still draws a chart that has no type.
 */
export type ChartResource = Omit<SKChartResource, 'type' | 'format'> & {
  type?: string;
  format?: string;
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
};

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
