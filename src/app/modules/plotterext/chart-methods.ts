import {
  normalizeBounds,
  RpcError,
  type ChartLayer,
  type ChartTime,
  type MethodHandler
} from 'signalk-plotterext-bus/host';
import { FBChart, FBCharts } from 'src/app/types';
import { parseParams } from './method-params';

// The schemas load with the validator on the first call, keeping TypeBox out
// of the initial bundle.
const schemas = () => import('./chart-params');

const BAD_REQUEST = 'charts.badRequest';

/**
 * Host method handlers for the `charts` capability — a lightweight facade over
 * the chart layers Freeboard already manages (the same charts the user turns on
 * and off in the chart controls). It enumerates them and changes visibility,
 * opacity and stacking order, and retargets a time-varying chart to an instant
 * (`charts.time`); it is **not** a chart provider (no create/delete).
 *
 * A pure factory over injected accessors so the handlers are unit-testable
 * without the Angular host service, matching the {@link createRouteMethods}
 * pattern; the service spreads the result into each extension context's method
 * table.
 */
export interface ChartMethodsDeps {
  /**
   * The full available chart set (server charts + built-in defaults) in display
   * order, **topmost first** — visible charts in their stacking order, hidden
   * charts after. Backs `chart.list` and is the source of truth for validating
   * that supplied ids name a managed chart.
   */
  listAvailableOrdered: () => Promise<FBCharts>;
  /** Show (`true`) or hide (`false`) each named chart. Idempotent. */
  setVisibility: (ids: string[], visible: boolean) => void | Promise<void>;
  /** Set display opacity (0..1) on each named chart. */
  setOpacity: (ids: string[], opacity: number) => void | Promise<void>;
  /** Set the display/stacking order, topmost first (host-clamped). */
  setOrder: (orderTopmostFirst: string[]) => void | Promise<void>;
  /**
   * Whether a chart is time-addressable — has a time dimension the host's own
   * time control would offer. Gates the `time` object on `chart.list` and
   * `charts.notTemporal` on `chart.setTime`.
   */
  isTemporal: (chart: FBChart) => boolean;
  /**
   * Show each named chart at an ISO 8601 instant, or its live frame for
   * `null`. The instant is passed through unchanged — no snapping or clamping.
   */
  setTime: (ids: string[], time: string | null) => void | Promise<void>;
}

/** The `time` object of a `chart.list` entry for a time-varying chart. */
export function toChartTime(fb: FBChart): ChartTime {
  const dim = fb[1]?.time;
  const time: ChartTime = {
    value: fb[1]?.timeValue ?? null,
    current: dim?.current !== false
  };
  if (typeof dim?.from === 'string') {
    time.from = dim.from;
  }
  if (typeof dim?.to === 'string') {
    time.to = dim.to;
  }
  if (typeof dim?.step === 'number') {
    time.step = dim.step;
  }
  if (Array.isArray(dim?.values)) {
    time.values = dim.values.slice();
  }
  return time;
}

/**
 * Map Freeboard's internal chart tuple to the host-agnostic {@link ChartLayer}.
 * `temporal` says whether the chart is time-addressable (see
 * {@link ChartMethodsDeps.isTemporal}); only then does the layer carry `time`.
 */
export function toChartLayer(fb: FBChart, temporal = false): ChartLayer {
  const [id, chart, visible] = fb;
  const layer: ChartLayer = {
    id,
    name: chart?.name ?? id,
    visible: !!visible,
    opacity:
      typeof chart?.defaultOpacity === 'number' ? chart.defaultOpacity : 1
  };
  if (chart?.type) {
    layer.type = chart.type;
  }
  // [west, south, east, north] in range, west > east across the antimeridian;
  // a chart's extent may be stored unwrapped (east past 180)
  const bounds = normalizeBounds(chart?.bounds);
  if (bounds) {
    layer.bounds = bounds;
  }
  if (typeof chart?.minZoom === 'number') {
    layer.minZoom = chart.minZoom;
  }
  if (typeof chart?.maxZoom === 'number') {
    layer.maxZoom = chart.maxZoom;
  }
  if (temporal) {
    layer.time = toChartTime(fb);
  }
  return layer;
}

export function createChartMethods(
  deps: ChartMethodsDeps
): Record<string, MethodHandler> {
  // Every supplied id must name a chart the host currently manages, otherwise
  // the caller is working from a stale list — surface it rather than silently
  // dropping the id.
  const requireKnown = (ids: string[], available: FBCharts): void => {
    const known = new Set(available.map((c) => c[0]));
    const unknown = ids.find((id) => !known.has(id));
    if (unknown !== undefined) {
      throw new RpcError(`Unknown chart id: ${unknown}`, {
        reason: 'charts.unknownId'
      });
    }
  };

  return {
    'chart.list': async () => {
      const available = await deps.listAvailableOrdered();
      return {
        charts: available.map((c) => toChartLayer(c, deps.isTemporal(c)))
      };
    },

    'chart.setVisibility': async (params) => {
      const { ids, visible } = await parseParams(
        (await schemas()).SetVisibilityParams,
        params,
        BAD_REQUEST
      );
      if (ids.length > 0) {
        requireKnown(ids, await deps.listAvailableOrdered());
        await deps.setVisibility(ids, visible);
      }
      return {};
    },

    'chart.setOpacity': async (params) => {
      const { ids, opacity } = await parseParams(
        (await schemas()).SetOpacityParams,
        params,
        BAD_REQUEST
      );
      if (ids.length > 0) {
        requireKnown(ids, await deps.listAvailableOrdered());
        await deps.setOpacity(ids, opacity);
      }
      return {};
    },

    'chart.setTime': async (params) => {
      const { ids, time } = await parseParams(
        (await schemas()).SetTimeParams,
        params,
        BAD_REQUEST
      );
      if (ids.length > 0) {
        const available = await deps.listAvailableOrdered();
        requireKnown(ids, available);
        // A managed chart with no time dimension is a distinct error from a
        // stale id: the caller's list is fine, the chart just cannot be
        // retargeted.
        const fixed = ids.find(
          (id) => !deps.isTemporal(available.find((c) => c[0] === id))
        );
        if (fixed !== undefined) {
          throw new RpcError(`Chart has no time dimension: ${fixed}`, {
            reason: 'charts.notTemporal'
          });
        }
        await deps.setTime(ids, time);
      }
      return {};
    },

    'chart.setOrder': async (params) => {
      const { order } = await parseParams(
        (await schemas()).SetOrderParams,
        params,
        BAD_REQUEST
      );
      if (order.length > 0) {
        requireKnown(order, await deps.listAvailableOrdered());
        await deps.setOrder(order);
      }
      return {};
    }
  };
}
