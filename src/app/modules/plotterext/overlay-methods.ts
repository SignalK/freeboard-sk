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
import { DataOverlayRefusal } from './data-overlay-model';
import { parseParams } from './method-params';

// The schemas load with the validator on the first call, keeping TypeBox out
// of the initial bundle.
const schemas = () => import('./overlay-params');

const BAD_REQUEST = 'overlays.badRequest';

/**
 * Host method handlers for map overlays: `overlay.list`,
 * `overlay.setVisibility` and `overlay.setOpacity` (both kinds),
 * `overlay.frame` (`overlays.image`), and `overlay.refresh`,
 * `overlay.setData`, `overlay.setLayer` and `overlay.setState`
 * (`overlays.data`). A pure
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
    reason: BAD_REQUEST
  });

function asRpc(err: unknown): unknown {
  if (err instanceof OverlayRefusal || err instanceof DataOverlayRefusal) {
    return err.reason === BAD_REQUEST
      ? badRequest(err.message)
      : new RpcError(err.message, { reason: err.reason });
  }
  return err;
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

async function toFrame(params: unknown): Promise<OverlayFrameInput> {
  try {
    const { overlayId, requestId, extent, image } = await parseParams(
      (await schemas()).FrameParams,
      params,
      BAD_REQUEST
    );
    return { overlayId, requestId, extent, image };
  } catch (err) {
    // A refused frame is never drawn, so its bitmap is released here.
    const image = (params as { image?: unknown } | null)?.image;
    if (isImageBitmap(image)) image.close();
    throw err;
  }
}

/** The params of the `overlays.data` methods, which the model checks further. */
async function dataParams(params: unknown): Promise<Record<string, unknown>> {
  return parseParams((await schemas()).DataParams, params, BAD_REQUEST);
}

export function createOverlayMethods(
  registry: OverlayRegistry,
  extension: string,
  runtime: string | null
): Record<string, MethodHandler> {
  const guard =
    (fn: (params: unknown) => unknown): MethodHandler =>
    async (params) => {
      try {
        return await fn(params);
      } catch (err) {
        throw asRpc(err);
      }
    };

  return {
    'overlay.list': guard(() => ({ overlays: registry.list(extension) })),

    'overlay.setVisibility': guard(async (params) => {
      const { ids, visible } = await parseParams(
        (await schemas()).SetVisibilityParams,
        params,
        BAD_REQUEST
      );
      registry.requireOwn(extension, ids);
      registry.setVisibility(
        ids.map((id) => overlayKey(extension, id)),
        visible
      );
      return {};
    }),

    'overlay.setOpacity': guard(async (params) => {
      const { ids, opacity } = await parseParams(
        (await schemas()).SetOpacityParams,
        params,
        BAD_REQUEST
      );
      registry.requireOwn(extension, ids);
      registry.setOpacity(
        ids.map((id) => overlayKey(extension, id)),
        opacity
      );
      return {};
    }),

    'overlay.frame': guard(async (params) =>
      registry.acceptFrame(extension, runtime, await toFrame(params))
    ),

    'overlay.refresh': guard(async (params) => {
      const p = await dataParams(params);
      registry.dataModel(extension, p['overlayId']).refresh({
        source: p['source'],
        tiles: p['tiles']
      });
      return {};
    }),

    'overlay.setData': guard(async (params) => {
      const p = await dataParams(params);
      registry.dataModel(extension, p['overlayId']).setData({
        source: p['source'],
        data: p['data'],
        upsert: p['upsert'],
        remove: p['remove']
      });
      return {};
    }),

    'overlay.setLayer': guard(async (params) => {
      const p = await dataParams(params);
      const model = registry.dataModel(extension, p['overlayId']);
      model.setLayer({
        layer: p['layer'],
        paint: p['paint'],
        layout: p['layout'],
        ...('filter' in p ? { filter: p['filter'] } : {})
      });
      return {};
    }),

    'overlay.setState': guard(async (params) => {
      const p = await dataParams(params);
      registry.dataModel(extension, p['overlayId']).setState(p['values']);
      return {};
    })
  };
}
