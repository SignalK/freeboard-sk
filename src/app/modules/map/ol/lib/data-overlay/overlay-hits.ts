// Hit-testing a map click (capability `actions.overlay`): the map's own
// features and the features of interactive data overlays are told apart by the
// layer they were hit in, never by their ids, which are the extension's and may
// look like anything (`waypoint.x`, `anchor`).

import Feature, { type FeatureLike } from 'ol/Feature';
import type OlMap from 'ol/Map';
import type { Pixel } from 'ol/pixel';

/** Layer property set on every vector layer a data overlay draws. */
export const DATA_OVERLAY_LAYER = 'fskDataOverlay';

/** What a data overlay's vector layer says about the features it draws. */
export interface DataOverlayLayerTag {
  /** `<extension>/<overlay id>` */
  overlayKey: string;
  /** The style source the features come from. */
  source: string;
  /** Whether its features are selectable. */
  interactive: boolean;
  /**
   * A vector source's `promoteId`: the property holding a feature's id. A
   * GeoJSON feature's id is always its top-level `id`.
   */
  promoteId?: unknown;
}

/** A selectable feature of an interactive data overlay under the pointer. */
export interface OverlayHit {
  overlayKey: string;
  source: string;
  /** The feature's id, exactly as the extension gave it. */
  featureId: string | number;
  /** The feature's own properties. */
  properties: Record<string, unknown>;
  feature: FeatureLike;
  /**
   * How many of the map's own features were hit above it: its place in the
   * hit order among them.
   */
  above: number;
}

/** What lies under the pointer. */
export interface MapHits {
  /** The map's own features, in hit order (topmost first). */
  features: FeatureLike[];
  /** Selectable data-overlay features, in hit order, each once. */
  overlayHits: OverlayHit[];
}

const tagOf = (layer: { get(key: string): unknown } | null | undefined) =>
  layer?.get(DATA_OVERLAY_LAYER) as DataOverlayLayerTag | undefined;

const usableId = (v: unknown): v is string | number =>
  (typeof v === 'string' && v.length > 0) ||
  (typeof v === 'number' && Number.isFinite(v));

/**
 * A data-overlay feature's id: a GeoJSON feature's top-level `id` (the id
 * `overlay.setData` upserts and removes by), or for a vector tile feature its
 * own id or the property the source's `promoteId` names, as in the MapLibre
 * Style Spec: one property for the source, or one per source layer.
 * Undefined when it has none, so it is not selectable.
 */
export function overlayFeatureId(
  feature: FeatureLike,
  promoteId: unknown
): string | number | undefined {
  const props = feature.getProperties();
  let id: unknown;
  if (feature instanceof Feature) {
    id = feature.getId();
  } else if (typeof promoteId === 'string') {
    id = props[promoteId];
  } else if (promoteId && typeof promoteId === 'object') {
    const byLayer = (promoteId as Record<string, unknown>)[
      String(props['layer'])
    ];
    id = typeof byLayer === 'string' ? props[byLayer] : feature.getId();
  } else {
    id = feature.getId();
  }
  return usableId(id) ? id : undefined;
}

/**
 * A data-overlay feature's own properties: without its geometry, and for a
 * vector tile feature without the `layer` key the tile reader adds.
 */
export function overlayFeatureProperties(
  feature: FeatureLike
): Record<string, unknown> {
  const props = { ...feature.getProperties() };
  if (feature instanceof Feature) delete props[feature.getGeometryName()];
  else delete props['layer'];
  return props;
}

/**
 * The features under `pixel`, as `getFeaturesAtPixel` finds them, with the
 * features of data overlays kept out of the map's own: a non-interactive
 * overlay is not hit-tested at all, so a click goes to what lies beneath it,
 * and an interactive one yields its selectable features apart, so none of
 * them is ever read as one of the map's.
 */
export function hitsAtPixel(
  map: OlMap,
  pixel: Pixel,
  hitTolerance: number
): MapHits {
  const features: FeatureLike[] = [];
  const overlayHits: OverlayHit[] = [];
  const seen = new Set<string>();
  map.forEachFeatureAtPixel(
    pixel,
    (feature, layer) => {
      const tag = tagOf(layer);
      if (!tag) {
        features.push(feature);
        return;
      }
      const featureId = overlayFeatureId(feature, tag.promoteId);
      if (featureId === undefined) return;
      // one feature drawn by several of the overlay's layers is hit once
      const key = `${tag.overlayKey}\n${tag.source}\n${typeof featureId}:${featureId}`;
      if (seen.has(key)) return;
      seen.add(key);
      overlayHits.push({
        overlayKey: tag.overlayKey,
        source: tag.source,
        featureId,
        properties: overlayFeatureProperties(feature),
        feature,
        above: features.length
      });
    },
    {
      hitTolerance,
      layerFilter: (layer) => tagOf(layer)?.interactive !== false
    }
  );
  return { features, overlayHits };
}
