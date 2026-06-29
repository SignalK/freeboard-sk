import {
  RPC_ERRORS,
  RpcError,
  type MethodHandler,
  type RoutePoint
} from 'signalk-plotterext-bus/host';
import { RouteBufferRegistry } from './route-buffer.registry';

/**
 * Host method handlers for the `routes` capability (Slice 0 surface:
 * list/create/get/delete). A pure factory over a {@link RouteBufferRegistry},
 * so the handlers are unit-testable without the Angular host service; the
 * service spreads the result into each extension context's method table
 * (matching the existing `stateMethods` / `resourcesMethods` pattern).
 *
 * Point operations and rename extend this surface in later slices.
 */

/**
 * Persist a buffer to the routes resource. The host owns the UX (e.g. a naming
 * dialog) and the server write; resolves with the stored resource href. Injected
 * because persistence is host-specific (the registry is pure data).
 */
export type RouteSaveHandler = (
  routeId: string,
  params: { name?: string; description?: string; dialog?: boolean }
) => Promise<{ href: string; rev: number } | null>;

/**
 * Bring a stored route (identified by `ref`) into the visible set, returning its
 * addressable `routeId`. Injected because loading + displaying a resource is
 * host-specific.
 */
export type RouteShowHandler = (
  ref: string
) => Promise<{ routeId: string; rev: number }>;

/** Remove a route from the map: unchecks a saved route's visibility, or deletes
 *  an unsaved draft. Host-specific (touches resource selections). */
export type RouteHideHandler = (routeId: string) => Promise<void> | void;

/** Permanently delete a saved route from the store (or discard an unsaved one).
 *  Host-specific (deletes the resource). */
export type RouteDeleteHandler = (routeId: string) => Promise<void> | void;

export function createRouteMethods(
  registry: RouteBufferRegistry,
  opts: {
    onSave?: RouteSaveHandler;
    onShow?: RouteShowHandler;
    onHide?: RouteHideHandler;
    onDelete?: RouteDeleteHandler;
  } = {}
): Record<string, MethodHandler> {
  const requireRouteId = (params: unknown): string => {
    const routeId = (params as { routeId?: unknown } | null)?.routeId;
    if (typeof routeId !== 'string' || routeId.length === 0) {
      throw new RpcError('route method requires a routeId', {
        code: RPC_ERRORS.INVALID_PARAMS,
        reason: 'routes.badRequest'
      });
    }
    return routeId;
  };

  const unknownId = () =>
    new RpcError('Unknown route buffer', { reason: 'routes.unknownId' });

  // A route needs at least two points, and every point must be a numeric
  // [lon, lat] tuple — otherwise the registry blows up in clonePoint() and the
  // caller sees an internal error instead of routes.badRequest.
  const requireValidPoints = (points: unknown): RoutePoint[] => {
    if (!Array.isArray(points) || points.length < 2) {
      throw new RpcError('a route needs at least two points', {
        code: RPC_ERRORS.INVALID_PARAMS,
        reason: 'routes.badRequest'
      });
    }
    for (const p of points) {
      const pos = (p as RoutePoint)?.position;
      if (
        !Array.isArray(pos) ||
        pos.length < 2 ||
        !Number.isFinite(pos[0]) ||
        !Number.isFinite(pos[1])
      ) {
        throw new RpcError(
          'each route point needs a numeric [lon, lat] position',
          { code: RPC_ERRORS.INVALID_PARAMS, reason: 'routes.badRequest' }
        );
      }
    }
    return points as RoutePoint[];
  };

  return {
    'route.list': () => ({ routes: registry.list() }),

    'route.create': (params) => {
      const { name, description, points } = (params ?? {}) as {
        name?: string;
        description?: string;
        points?: RoutePoint[];
      };
      const validPoints = requireValidPoints(points);
      const buffer = registry.create({ name, description, points: validPoints });
      return { routeId: buffer.routeId, rev: buffer.rev };
    },

    'route.replace': (params) => {
      const routeId = requireRouteId(params);
      const { points } = (params ?? {}) as { points?: RoutePoint[] };
      // Same invariants as route.create — never let a replace wipe a route down
      // to an invalid geometry or feed the registry malformed points.
      const validPoints = requireValidPoints(points);
      const updated = registry.replace(routeId, validPoints);
      if (!updated) {
        throw unknownId();
      }
      return { rev: updated.rev };
    },

    'route.save': async (params) => {
      const routeId = requireRouteId(params);
      if (!registry.has(routeId)) {
        throw unknownId();
      }
      if (!opts.onSave) {
        throw new RpcError('This host cannot persist routes', {
          reason: 'routes.notSupported'
        });
      }
      const { name, description, dialog } = (params ?? {}) as {
        name?: string;
        description?: string;
        dialog?: boolean;
      };
      const result = await opts.onSave(routeId, { name, description, dialog });
      if (!result) {
        throw new RpcError('Route save was cancelled', {
          reason: 'routes.saveCancelled'
        });
      }
      return result;
    },

    'route.get': (params) => {
      const buffer = registry.get(requireRouteId(params));
      if (!buffer) {
        throw unknownId();
      }
      return buffer;
    },

    'route.hide': async (params) => {
      const routeId = requireRouteId(params);
      if (!registry.has(routeId)) {
        throw unknownId();
      }
      // Unchecking a saved route's visibility is host-specific; a draft just
      // leaves the buffer.
      if (opts.onHide) {
        await opts.onHide(routeId);
      } else {
        registry.delete(routeId);
      }
      return {};
    },

    'route.delete': async (params) => {
      const routeId = requireRouteId(params);
      if (!registry.has(routeId)) {
        throw unknownId();
      }
      // Permanently deleting a saved resource is host-specific; without wiring
      // we can only discard the buffer (draft semantics, saved:false).
      if (opts.onDelete) {
        await opts.onDelete(routeId);
      } else {
        registry.delete(routeId, false);
      }
      return {};
    },

    'route.show': (params) => {
      const ref = (params as { ref?: unknown } | null)?.ref;
      if (typeof ref !== 'string' || ref.length === 0) {
        throw new RpcError('route.show requires a ref', {
          code: RPC_ERRORS.INVALID_PARAMS,
          reason: 'routes.badRef'
        });
      }
      if (!opts.onShow) {
        throw new RpcError('route.show is not supported by this host', {
          reason: 'routes.notSupported'
        });
      }
      return opts.onShow(ref);
    }
  };
}
