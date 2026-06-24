import TileState from 'ol/TileState';
import type VectorTile from 'ol/VectorTile';
import type { FeatureLike } from 'ol/Feature';
import type { Extent } from 'ol/extent';
import type Projection from 'ol/proj/Projection';

type PendingByZoom = Map<number, Set<AbortController>>;

/**
 * Abort and drop controllers held under zoom levels other than `z`, then
 * return (or create) the controller bucket for `z`. Keeps the vector
 * loader's per-zoom bookkeeping in lockstep.
 */
function bucketForZoom(
  pending: PendingByZoom,
  z: number
): Set<AbortController> {
  for (const [oldZ, controllers] of pending) {
    if (oldZ !== z) {
      for (const c of controllers) c.abort();
      pending.delete(oldZ);
    }
  }
  let set = pending.get(z);
  if (!set) {
    set = new Set();
    pending.set(z, set);
  }
  return set;
}

function releaseController(
  pending: PendingByZoom,
  z: number,
  controller: AbortController
) {
  const s = pending.get(z);
  if (s) {
    s.delete(controller);
    if (s.size === 0) pending.delete(z);
  }
}

/**
 * Build an OL VectorTile `tileLoadFunction` that aborts in-flight loads from
 * superseded zoom levels. When a new tile request arrives at zoom Z, any
 * outstanding controllers for zoom !== Z are aborted so they free up the
 * browser's connection pool for the now-visible level. The fetch is wrapped
 * inside `tile.setLoader` because OL's VectorTile contract has the tile own
 * its decoded features.
 */
export function createAbortableVectorTileLoader(): (
  tile: VectorTile<FeatureLike>,
  src: string
) => void {
  const pending: PendingByZoom = new Map();

  return function loader(tile: VectorTile<FeatureLike>, src: string) {
    const z = tile.getTileCoord()[0];
    const bucket = bucketForZoom(pending, z);

    tile.setLoader(
      (extent: Extent, _resolution: number, projection: Projection) => {
        const controller = new AbortController();
        bucket.add(controller);

        tile.setState(TileState.LOADING);
        fetch(src, { signal: controller.signal })
          .then((r) => r.arrayBuffer())
          .then((data) => {
            const format = tile.getFormat();
            const features = format.readFeatures(data, {
              extent,
              featureProjection: projection
            }) as FeatureLike[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (tile as any).setFeatures(features);
            tile.setState(TileState.LOADED);
          })
          .catch((err) => {
            if (err?.name !== 'AbortError') {
              tile.setState(TileState.ERROR);
            }
          })
          .finally(() => {
            releaseController(pending, z, controller);
          });
      }
    );
  };
}
