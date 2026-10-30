import type { Map } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import {
  containsExtent,
  Extent,
  getHeight,
  getWidth,
  intersects
} from 'ol/extent';
import { MultiLineString } from 'ol/geom';
import type { Coordinate } from 'ol/coordinate';
import type { GeometryFunction } from 'ol/style/Style';
import { worldCopyOffset } from './util';

/**
 * The box a long line is clipped to around a view: the view's grid cell, one
 * view across, plus two cells on every side. Snapping to the grid keeps the box
 * while the view pans within a cell, so a pan that ends there neither redraws
 * the line nor moves the phase of its dashes, and the margin of at least one
 * view covers a pan drawn from the old box before the layer is rebuilt.
 *
 * The box is moved into the world copy that holds the view centre, since a
 * wrapping vector layer draws every world copy from the primary one.
 */
export function clipBoxForView(view: Extent, worldWidth: number): Extent {
  const cell = Math.max(getWidth(view), getHeight(view));
  const cx = (view[0] + view[2]) / 2;
  const cy = (view[1] + view[3]) / 2;
  const offset = worldCopyOffset(cx, worldWidth);
  const x = (Math.floor((cx - offset) / cell) + 0.5) * cell;
  const y = (Math.floor(cy / cell) + 0.5) * cell;
  const half = 2.5 * cell;
  return [x - half, y - half, x + half, y + half];
}

/** Clips the segment a-b to `box`, or returns null when it misses the box. */
function clipSegment(
  a: Coordinate,
  b: Coordinate,
  box: Extent
): [Coordinate, Coordinate] | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t0 = 0;
  let t1 = 1;
  const edges: Array<[number, number]> = [
    [-dx, a[0] - box[0]],
    [dx, box[2] - a[0]],
    [-dy, a[1] - box[1]],
    [dy, box[3] - a[1]]
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) {
        return null;
      }
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) {
          return null;
        }
        t0 = Math.max(t0, t);
      } else {
        if (t < t0) {
          return null;
        }
        t1 = Math.min(t1, t);
      }
    }
  }
  const at = (t: number): Coordinate =>
    t === 0 ? a : t === 1 ? b : [a[0] + t * dx, a[1] + t * dy];
  return [at(t0), at(t1)];
}

/**
 * The parts of `lines` inside `box`. Segments clipped back to back stay one
 * line, so a dash pattern runs on unbroken through them.
 */
export function clipLines(lines: Coordinate[][], box: Extent): Coordinate[][] {
  const out: Coordinate[][] = [];
  for (const line of lines) {
    let current: Coordinate[] | null = null;
    for (let i = 1; i < line.length; i++) {
      const seg = clipSegment(line[i - 1], line[i], box);
      if (!seg) {
        current = null;
        continue;
      }
      if (current && seg[0] === line[i - 1]) {
        current.push(seg[1]);
      } else {
        current = [seg[0], seg[1]];
        out.push(current);
      }
      if (seg[1] !== line[i]) {
        current = null;
      }
    }
  }
  return out;
}

/**
 * `geometry` cut to `box` and its copies one world east and west, or
 * `geometry` itself when it lies inside the box already.
 */
export function clipMultiLineString(
  geometry: MultiLineString,
  box: Extent,
  worldWidth: number
): MultiLineString {
  const extent = geometry.getExtent();
  if (containsExtent(box, extent)) {
    return geometry;
  }
  const lines = geometry.getCoordinates();
  const parts: Coordinate[][] = [];
  for (const shift of [-worldWidth, 0, worldWidth]) {
    const shifted: Extent = [box[0] + shift, box[1], box[2] + shift, box[3]];
    if (intersects(shifted, extent)) {
      parts.push(...clipLines(lines, shifted));
    }
  }
  return new MultiLineString(parts);
}

/**
 * A style geometry function drawing a feature's MultiLineString only around
 * the map's current view.
 *
 * A canvas dashes a stroke along its whole path, off-screen parts included, so
 * a long dashed line costs time on every repaint in proportion to its length
 * in pixels: a track thousands of kilometres long, zoomed in close, takes a
 * Raspberry Pi's GPU around a tenth of a second a frame. The feature keeps its
 * whole geometry for everything but drawing.
 */
export function viewClippedLines(
  getMap: () => Map | undefined
): GeometryFunction {
  const cache = new WeakMap<
    FeatureLike,
    { key: string; source: MultiLineString; clipped: MultiLineString }
  >();
  return (feature) => {
    const geometry = feature.getGeometry();
    if (!(geometry instanceof MultiLineString)) {
      return geometry;
    }
    const map = getMap();
    const size = map?.getSize();
    const view = map?.getView();
    const worldExtent = view?.getProjection().getExtent();
    if (!view || !size || !worldExtent || !view.isDef()) {
      return geometry;
    }
    const worldWidth = getWidth(worldExtent);
    const box = clipBoxForView(view.calculateExtent(size), worldWidth);
    const key = `${box.join()}@${geometry.getRevision()}`;
    const hit = cache.get(feature);
    if (hit && hit.source === geometry && hit.key === key) {
      return hit.clipped;
    }
    const clipped = clipMultiLineString(geometry, box, worldWidth);
    cache.set(feature, { key, source: geometry, clipped });
    return clipped;
  };
}
