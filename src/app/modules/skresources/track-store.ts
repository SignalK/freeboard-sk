/**
 * Freeboard keeps its tracks (GPX and GeoJSON imports) in one store: the
 * Signal K Track API when it can store tracks and the tracks plugin lists
 * them, otherwise the custom `/resources/tracks` collection. The helpers here are pure so the
 * store choice and the request shapes can be tested without a server.
 */
import { MultiLineString, MultiLineStringFeature } from 'src/app/types';

/** The tracks plugin's list of every stored import, whatever its time span
 * and whether or not it has times, which no Track API query can match. */
export const TRACK_IMPORTS_LIST = '/plugins/tracks/imports';
/** A malformed id on the v2 api: a server with the Track API's by-id routes
 * (store, fetch, delete) answers 400, an older one has no such route. */
export const TRACK_BY_ID_PROBE = '/tracks/_';
export const TRACK_STORE_PATH = '/tracks';

/** Track API path of one stored track. Ids carry the provider and a colon
 * (`tracks:imported:<uuid>`), so they are encoded as one path segment. */
export function trackStoreItemPath(id: string): string {
  return `${TRACK_STORE_PATH}/${encodeURIComponent(id)}`;
}

/** A track as returned by `GET /tracks/:id` (the parts Freeboard reads). */
export interface StoredTrackFeature {
  type: 'Feature';
  geometry: { type: 'MultiLineString'; coordinates: MultiLineString } | null;
  properties: {
    id?: string;
    /** When a client stored it; tracks plugin releases before that set `true`. */
    imported?: string | true;
    name?: string;
    description?: string;
    coordTimes?: string[][];
    [key: string]: unknown;
  };
}

/** The body `POST /tracks` accepts: a MultiLineString with the track's own
 * metadata and, when every point has one, the time of each point. */
export interface StoreTrackBody {
  type: 'Feature';
  geometry: { type: 'MultiLineString'; coordinates: MultiLineString };
  properties: { coordTimes?: string[][]; [key: string]: unknown };
}

/** Whether a track came from the Track API store rather than from
 * `/resources/tracks`: only the store marks its tracks `imported`. */
export function isStoredTrack(feature: MultiLineStringFeature): boolean {
  const imported = feature?.properties?.imported;
  return imported !== undefined && imported !== false;
}

/** Point times nested to match the segments, or undefined unless every point
 * has a valid time (the Track API needs one per point or none). */
export function coordTimesOf(
  segments: Array<Array<{ datetime?: Date }>>
): string[][] | undefined {
  const times: string[][] = [];
  for (const seg of segments) {
    const line: string[] = [];
    for (const pt of seg) {
      const t = pt.datetime;
      if (!(t instanceof Date) || isNaN(t.getTime())) {
        return undefined;
      }
      line.push(t.toISOString());
    }
    times.push(line);
  }
  return times;
}

/** Turn a track feature into a `POST /tracks` body. The properties the
 * provider derives for itself (id, bbox, counts, time range) are left out;
 * everything else Freeboard stored with the track goes along. */
/** Whether `times` holds one valid time per point, nested like `lines`. */
function timesFit(times: unknown, lines: unknown[][]): times is string[][] {
  return (
    Array.isArray(times) &&
    times.length === lines.length &&
    times.every(
      (t, i) =>
        Array.isArray(t) &&
        t.length === lines[i].length &&
        t.every((s) => typeof s === 'string' && !isNaN(Date.parse(s)))
    )
  );
}

export function storeTrackBody(
  feature: MultiLineStringFeature,
  coordTimes?: string[][]
): StoreTrackBody {
  const properties: StoreTrackBody['properties'] = {};
  Object.entries(feature.properties ?? {}).forEach(([k, v]) => {
    if (!DERIVED.has(k) && v !== undefined && v !== null) {
      properties[k] = v;
    }
  });
  // A file's own coordTimes is kept only when it fits the geometry, or the
  // Track API refuses the whole track.
  const times = coordTimes ?? properties.coordTimes;
  delete properties.coordTimes;
  if (timesFit(times, feature.geometry.coordinates)) {
    properties.coordTimes = times;
  }
  return {
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: feature.geometry.coordinates.map((line) =>
        line.map((p) => [p[0], p[1]])
      )
    },
    properties
  };
}

/** Properties never copied from a file: the ones a provider derives, and the
 * vessel. A file naming the own vessel would otherwise be written into its
 * recording by the tracks plugin, replacing what the boat recorded; which
 * vessel a track belongs to is the user's choice, not the file's. */
const DERIVED = new Set([
  'id',
  'providerId',
  'imported',
  'bbox',
  'pointCount',
  'from',
  'to',
  'resolution',
  'epsilon',
  'context',
  'contextName',
  'isSelf'
]);

/** A stored track as the feature Freeboard draws, keyed by its Track API id. */
export function toTrackFeature(
  f: StoredTrackFeature
): MultiLineStringFeature | undefined {
  // only imports are fetched from the store, whether or not the provider
  // marks them
  const id = f?.properties?.id;
  if (!id || !f.geometry) {
    return undefined;
  }
  return {
    type: 'Feature',
    id,
    geometry: { type: 'MultiLineString', coordinates: f.geometry.coordinates },
    properties: { ...f.properties, imported: f.properties.imported ?? true }
  };
}
