import {
  RPC_ERRORS,
  RpcError,
  type MethodHandler
} from 'signalk-plotterext-bus/host';
import {
  OverlayRefusal,
  OverlayRegistry,
  overlayKey,
  type OverlayFrameInput
} from './overlay-registry';

/**
 * Host method handlers for the `overlays.image` capability: `overlay.list`,
 * `overlay.setVisibility`, `overlay.setOpacity` and `overlay.frame`. A pure
 * factory over the registry, matching the {@link createChartMethods} pattern,
 * so the handlers are unit-testable without the Angular host service.
 *
 * `extension` scopes every call to that extension's own overlays; `runtime` is
 * the calling context's background-runtime id (null for any other kind), since
 * only an overlay's own runtime may send its frames.
 */

const badRequest = (message: string) =>
  new RpcError(message, {
    code: RPC_ERRORS.INVALID_PARAMS,
    reason: 'overlays.badRequest'
  });

function asRpc(err: unknown): unknown {
  if (err instanceof OverlayRefusal) {
    return err.reason === 'overlays.badRequest'
      ? badRequest(err.message)
      : new RpcError(err.message, { reason: err.reason });
  }
  return err;
}

function requireIds(params: unknown): string[] {
  const ids = (params as { ids?: unknown })?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !ids.every((id) => typeof id === 'string')
  ) {
    throw badRequest('`ids` must be a non-empty array of overlay ids');
  }
  return ids;
}

/**
 * Whether `v` is a transferred `ImageBitmap`. Duck-typed where the global is
 * missing (jsdom), so the check stays testable.
 */
export function isImageBitmap(v: unknown): v is ImageBitmap {
  if (typeof ImageBitmap !== 'undefined') {
    return v instanceof ImageBitmap;
  }
  const b = v as ImageBitmap;
  return (
    !!b &&
    typeof b === 'object' &&
    Number.isInteger(b.width) &&
    Number.isInteger(b.height) &&
    typeof b.close === 'function'
  );
}

function toFrame(params: unknown): OverlayFrameInput {
  const p = (params ?? {}) as Record<string, unknown>;
  const image = p['image'];
  if (!isImageBitmap(image)) {
    throw badRequest('`image` must be a transferred ImageBitmap');
  }
  const fail = (message: string) => {
    image.close();
    return badRequest(message);
  };
  if (typeof p['overlayId'] !== 'string') {
    throw fail('`overlayId` is required');
  }
  if (p['requestId'] !== undefined && typeof p['requestId'] !== 'string') {
    throw fail('`requestId` must be a string when given');
  }
  const extent = p['extent'];
  if (
    !Array.isArray(extent) ||
    extent.length !== 4 ||
    !extent.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
    !(extent[2] > extent[0] && extent[3] > extent[1])
  ) {
    throw fail(
      '`extent` must be [minX, minY, maxX, maxY] in EPSG:3857 with max > min'
    );
  }
  return {
    overlayId: p['overlayId'],
    requestId: p['requestId'] as string | undefined,
    extent: extent as [number, number, number, number],
    image
  };
}

export function createOverlayMethods(
  registry: OverlayRegistry,
  extension: string,
  runtime: string | null
): Record<string, MethodHandler> {
  const guard =
    (fn: (params: unknown) => unknown): MethodHandler =>
    (params) => {
      try {
        return fn(params);
      } catch (err) {
        throw asRpc(err);
      }
    };

  return {
    'overlay.list': guard(() => ({ overlays: registry.list(extension) })),

    'overlay.setVisibility': guard((params) => {
      const ids = requireIds(params);
      const visible = (params as { visible?: unknown }).visible;
      if (typeof visible !== 'boolean') {
        throw badRequest('`visible` must be a boolean');
      }
      registry.requireOwn(extension, ids);
      registry.setVisibility(
        ids.map((id) => overlayKey(extension, id)),
        visible
      );
      return {};
    }),

    'overlay.setOpacity': guard((params) => {
      const ids = requireIds(params);
      const opacity = (params as { opacity?: unknown }).opacity;
      if (
        typeof opacity !== 'number' ||
        !Number.isFinite(opacity) ||
        opacity < 0 ||
        opacity > 1
      ) {
        throw badRequest('`opacity` must be a number from 0 to 1');
      }
      registry.requireOwn(extension, ids);
      registry.setOpacity(
        ids.map((id) => overlayKey(extension, id)),
        opacity
      );
      return {};
    }),

    'overlay.frame': guard((params) =>
      registry.acceptFrame(extension, runtime, toFrame(params))
    )
  };
}
