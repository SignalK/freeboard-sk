import {
  RPC_ERRORS,
  RpcError,
  type ChartLayer,
  type MethodHandler
} from 'signalk-plotterext-bus/host';
import { FBChart, FBCharts } from 'src/app/types';

/**
 * Host method handlers for the `charts` capability — a lightweight facade over
 * the chart layers Freeboard already manages (the same charts the user turns on
 * and off in the chart controls). It enumerates them and changes visibility,
 * opacity and stacking order; it is **not** a chart provider (no create/delete).
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
}

/** Map Freeboard's internal chart tuple to the host-agnostic {@link ChartLayer}. */
export function toChartLayer(fb: FBChart): ChartLayer {
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
  if (Array.isArray(chart?.bounds) && chart.bounds.length === 4) {
    layer.bounds = [
      chart.bounds[0],
      chart.bounds[1],
      chart.bounds[2],
      chart.bounds[3]
    ];
  }
  if (typeof chart?.minZoom === 'number') {
    layer.minZoom = chart.minZoom;
  }
  if (typeof chart?.maxZoom === 'number') {
    layer.maxZoom = chart.maxZoom;
  }
  return layer;
}

export function createChartMethods(
  deps: ChartMethodsDeps
): Record<string, MethodHandler> {
  const badRequest = (message: string) =>
    new RpcError(message, {
      code: RPC_ERRORS.INVALID_PARAMS,
      reason: 'charts.badRequest'
    });

  // Reject a malformed id list at the boundary so it can't reach the host
  // services. An empty array is a legal no-op batch.
  const requireIds = (v: unknown, field: string): string[] => {
    if (
      !Array.isArray(v) ||
      v.some((x) => typeof x !== 'string' || x.length === 0)
    ) {
      throw badRequest(`${field} must be an array of chart ids`);
    }
    return v as string[];
  };

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
      return { charts: available.map(toChartLayer) };
    },

    'chart.setVisibility': async (params) => {
      const ids = requireIds((params as { ids?: unknown })?.ids, 'ids');
      const visible = (params as { visible?: unknown })?.visible;
      if (typeof visible !== 'boolean') {
        throw badRequest('visible must be a boolean');
      }
      if (ids.length > 0) {
        requireKnown(ids, await deps.listAvailableOrdered());
        await deps.setVisibility(ids, visible);
      }
      return {};
    },

    'chart.setOpacity': async (params) => {
      const ids = requireIds((params as { ids?: unknown })?.ids, 'ids');
      const opacity = (params as { opacity?: unknown })?.opacity;
      if (typeof opacity !== 'number' || !Number.isFinite(opacity)) {
        throw badRequest('opacity must be a finite number');
      }
      if (opacity < 0 || opacity > 1) {
        throw badRequest('opacity must be between 0 and 1');
      }
      if (ids.length > 0) {
        requireKnown(ids, await deps.listAvailableOrdered());
        await deps.setOpacity(ids, opacity);
      }
      return {};
    },

    'chart.setOrder': async (params) => {
      const order = requireIds((params as { order?: unknown })?.order, 'order');
      if (order.length > 0) {
        requireKnown(order, await deps.listAvailableOrdered());
        await deps.setOrder(order);
      }
      return {};
    }
  };
}
