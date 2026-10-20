import { RpcError, type MethodHandler } from 'signalk-plotterext-bus/host';
import { RouteBufferRegistry } from './route-buffer.registry';
import { parseParams } from './method-params';

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

// The schemas load with the validator on the first call, keeping TypeBox out
// of the initial bundle.
const schemas = () => import('./route-params');

const BAD_REQUEST = 'routes.badRequest';

export function createRouteMethods(
  registry: RouteBufferRegistry,
  opts: {
    onSave?: RouteSaveHandler;
    onShow?: RouteShowHandler;
    onHide?: RouteHideHandler;
    onDelete?: RouteDeleteHandler;
  } = {}
): Record<string, MethodHandler> {
  const requireRouteId = async (params: unknown): Promise<string> =>
    (await parseParams((await schemas()).RouteIdParams, params, BAD_REQUEST))
      .routeId;

  const unknownId = () =>
    new RpcError('Unknown route buffer', { reason: 'routes.unknownId' });

  return {
    'route.list': () => ({ routes: registry.list() }),

    'route.create': async (params) => {
      const { name, description, points } = await parseParams(
        (await schemas()).CreateParams,
        params,
        BAD_REQUEST
      );
      const buffer = registry.create({ name, description, points });
      return { routeId: buffer.routeId, rev: buffer.rev };
    },

    'route.replace': async (params) => {
      // Same invariants as route.create — never let a replace wipe a route down
      // to an invalid geometry or feed the registry malformed points.
      const { routeId, points } = await parseParams(
        (await schemas()).ReplaceParams,
        params,
        BAD_REQUEST
      );
      const updated = registry.replace(routeId, points);
      if (!updated) {
        throw unknownId();
      }
      return { rev: updated.rev };
    },

    'route.save': async (params) => {
      const routeId = await requireRouteId(params);
      if (!registry.has(routeId)) {
        throw unknownId();
      }
      if (!opts.onSave) {
        throw new RpcError('This host cannot persist routes', {
          reason: 'routes.notSupported'
        });
      }
      const { name, description, dialog } = await parseParams(
        (await schemas()).SaveParams,
        params,
        BAD_REQUEST
      );
      const result = await opts.onSave(routeId, { name, description, dialog });
      if (!result) {
        throw new RpcError('Route save was cancelled', {
          reason: 'routes.saveCancelled'
        });
      }
      return result;
    },

    'route.get': async (params) => {
      const buffer = registry.get(await requireRouteId(params));
      if (!buffer) {
        throw unknownId();
      }
      return buffer;
    },

    'route.hide': async (params) => {
      const routeId = await requireRouteId(params);
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
      const routeId = await requireRouteId(params);
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

    'route.show': async (params) => {
      const { ref } = await parseParams(
        (await schemas()).ShowParams,
        params,
        'routes.badRef'
      );
      if (!opts.onShow) {
        throw new RpcError('route.show is not supported by this host', {
          reason: 'routes.notSupported'
        });
      }
      return opts.onShow(ref);
    }
  };
}
