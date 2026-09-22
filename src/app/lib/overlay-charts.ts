/**
 * Overlays → charts adoption: the pure mapping from a legacy `infolayers`
 * entry (an Overlay, as stored by Freeboard 2.19 – 3.1) to a chart resource.
 *
 * Overlays were folded into charts (#784): an existing entry is *adopted* —
 * presented as a chart straight from the `infolayers` collection, with no
 * server write — and *migrated* to a real chart resource once the session can
 * write one. Both use the same deterministic chart id, so a client that only
 * reads and a client that migrates agree on which chart an Overlay became, and
 * every per-chart setting keyed by that id (opacity, order, loop range) carries
 * across the migration untouched.
 *
 * No Angular or OpenLayers here; the service wiring (listing, migration,
 * delete) lives in `SKResourceService`.
 */
import { ChartResource, InfoLayerResource } from 'src/app/types';
import { chartTimeFromCapabilities } from './chart-time';

/**
 * Prefix of the chart id an Overlay is adopted under. The server accepts a
 * chart id matching `^[A-Za-z0-9_-]{8,}$`, so the prefix joins with a hyphen
 * (a `:` would be rejected on PUT).
 */
export const OVERLAY_CHART_ID_PREFIX = 'overlay-';

/** Chart id an Overlay with the supplied `infolayers` id is adopted under. */
export function overlayChartId(overlayId: string): string {
  return `${OVERLAY_CHART_ID_PREFIX}${overlayId}`;
}

/**
 * The `infolayers` id behind an adopted chart id, or `undefined` when the id
 * is not an adopted Overlay's.
 */
export function overlayIdFromChartId(chartId: string): string | undefined {
  if (
    typeof chartId !== 'string' ||
    !chartId.startsWith(OVERLAY_CHART_ID_PREFIX) ||
    chartId.length === OVERLAY_CHART_ID_PREFIX.length
  ) {
    return undefined;
  }
  return chartId.slice(OVERLAY_CHART_ID_PREFIX.length);
}

/** True when a custom-resource entry is a well-formed Overlay. */
export function isOverlayResource(item: unknown): item is InfoLayerResource {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const r = item as InfoLayerResource;
  return r.type === 'InfoLayer' && !!r.values && typeof r.values === 'object';
}

/** Chart source type for an Overlay's `sourceType` (WMS / WMTS / xyz). */
function chartTypeFromOverlay(sourceType?: string): string {
  switch ((sourceType ?? '').toLowerCase()) {
    case 'wms':
      return 'WMS';
    case 'wmts':
      return 'WMTS';
    default:
      return 'tilelayer';
  }
}

/**
 * Map an Overlay to the chart resource it is adopted as. Field by field:
 * `sourceType` → `type`, `opacity` → `defaultOpacity`, `minZoom` / `maxZoom`
 * → `minzoom` / `maxzoom`, `refreshInterval` as-is (both are milliseconds),
 * and the time dimension parsed from the source's capabilities → the chart
 * `time` block, so a WMS Overlay with a time dimension gets the Time palette.
 * The chart is marked as served by `resources-provider` so the chart list
 * offers Remove for it, as it did for the Overlay.
 * @param overlayId The entry's `infolayers` id
 * @param overlay The entry
 * @returns Chart resource carrying the adopted chart id as `identifier`
 */
export function chartFromOverlay(
  overlayId: string,
  overlay: InfoLayerResource
): ChartResource & { $source: string } {
  const v = overlay.values ?? ({} as InfoLayerResource['values']);
  const chart: ChartResource & { $source: string } = {
    identifier: overlayChartId(overlayId),
    name: overlay.name ?? undefined,
    description: overlay.description ?? undefined,
    type: chartTypeFromOverlay(v.sourceType),
    url: v.url,
    layers: Array.isArray(v.layers) ? v.layers.slice() : [],
    $source: 'resources-provider'
  };
  if (typeof v.opacity === 'number' && Number.isFinite(v.opacity)) {
    chart.defaultOpacity = Math.min(1, Math.max(0, v.opacity));
  }
  if (typeof v.minZoom === 'number' && Number.isFinite(v.minZoom)) {
    chart.minzoom = v.minZoom;
  }
  if (typeof v.maxZoom === 'number' && Number.isFinite(v.maxZoom)) {
    chart.maxzoom = v.maxZoom;
  }
  if (
    typeof v.refreshInterval === 'number' &&
    Number.isFinite(v.refreshInterval) &&
    v.refreshInterval > 0
  ) {
    chart.refreshInterval = v.refreshInterval;
  }
  const time = chartTimeFromCapabilities(v.time);
  if (time) {
    chart.time = time;
  }
  return chart;
}
