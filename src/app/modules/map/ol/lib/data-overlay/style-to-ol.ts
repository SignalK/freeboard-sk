import { expression, latest } from '@maplibre/maplibre-gl-style-spec';
import {
  resolveLayer,
  type DemEncoding,
  type ReliefRamp,
  type StyleLayer
} from 'src/app/modules/plotterext/data-overlay-style';
import { isUnevaluableByOl } from '../charts/chart-utils';

/**
 * Translating the parts of a data overlay's MapLibre style that Freeboard
 * draws itself (`color-relief` and `raster` layers) into OpenLayers terms.
 * Pure functions, unit-tested without a map.
 */

/** Resolution of MapLibre zoom 0: the world is 512 pixels wide. */
const ML_RESOLUTION_0 = 78271.51696402048;

/** MapLibre's zoom for an OpenLayers view resolution (EPSG:3857 metres per pixel). */
export function mapLibreZoom(resolution: number): number {
  return Math.log2(ML_RESOLUTION_0 / resolution);
}

/** The OpenLayers resolution at a MapLibre zoom. */
export function resolutionAt(zoom: number): number {
  return ML_RESOLUTION_0 / 2 ** zoom;
}

/**
 * OpenLayers `minResolution` / `maxResolution` for a MapLibre zoom range:
 * shown from `minzoom` (inclusive) up to `maxzoom` (exclusive). OL's
 * `maxResolution` is exclusive and `minResolution` inclusive, hence the nudge.
 */
export function resolutionRange(
  minzoom: number | undefined,
  maxzoom: number | undefined
): { minResolution?: number; maxResolution?: number } {
  const nudge = 1 + 1e-9;
  return {
    ...(minzoom !== undefined && minzoom > 0
      ? { maxResolution: resolutionAt(minzoom) * nudge }
      : {}),
    ...(maxzoom !== undefined && maxzoom < 24
      ? { minResolution: resolutionAt(maxzoom) * nudge }
      : {})
  };
}

/** Elevation of one `raster-dem` pixel from its 0..255 channels. */
export function decodeElevation(
  enc: DemEncoding,
  r: number,
  g: number,
  b: number
): number {
  return enc.r * r + enc.g * g + enc.b * b - enc.base;
}

type OlExpression = unknown[];

/**
 * The elevation as an OpenLayers WebGL expression. OL's `band` values are
 * normalised to 0..1, so each factor is scaled by 255. The decode is linear
 * in each channel, so the GPU's linear filtering of the encoded texture
 * interpolates elevation correctly too.
 */
export function elevationExpression(enc: DemEncoding): OlExpression {
  return [
    '-',
    [
      '+',
      ['*', ['band', 1], 255 * enc.r],
      ['*', ['band', 2], 255 * enc.g],
      ['*', ['band', 3], 255 * enc.b]
    ],
    enc.base
  ];
}

/**
 * The `color-relief` colour of each pixel: the ramp interpolated linearly
 * over the decoded elevation, clamped to the end colours. A pixel with zero
 * alpha is drawn transparent: that is how Freeboard draws a missing tile
 * (404/204), which the spec treats as empty.
 */
export function reliefColorExpression(
  ramp: ReliefRamp,
  enc: DemEncoding
): OlExpression {
  const colour =
    ramp.stops.length === 1
      ? ramp.colors[0]
      : [
          'interpolate',
          ['linear'],
          elevationExpression(enc),
          ...ramp.stops.flatMap((s, i) => [s, ramp.colors[i]])
        ];
  return ['case', ['>', ['band', 4], 0], colour, [0, 0, 0, 0]];
}

/** Compiled opacity expressions by value: they are re-evaluated on every `moveend`. */
const compiledPaint = new WeakMap<
  object,
  Map<string, ReturnType<typeof expression.createPropertyExpression>>
>();

/**
 * Evaluate a numeric paint property (`raster-opacity`,
 * `color-relief-opacity`) at a MapLibre zoom with the overlay's global state.
 * Falls back to the property's default when the value does not evaluate.
 */
export function evaluatePaintNumber(
  layerType: 'raster' | 'color-relief',
  property: string,
  value: unknown,
  zoom: number,
  globalState: Record<string, unknown>
): number {
  const spec = (
    latest as unknown as Record<string, Record<string, { default?: number }>>
  )[`paint_${layerType}`][property];
  const fallback = spec?.default ?? 1;
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value !== 'object' || value === null) return fallback;
  let byProperty = compiledPaint.get(value);
  if (!byProperty) {
    byProperty = new Map();
    compiledPaint.set(value, byProperty);
  }
  let compiled = byProperty.get(property);
  if (!compiled) {
    compiled = expression.createPropertyExpression(
      value,
      spec as Parameters<typeof expression.createPropertyExpression>[1]
    );
    byProperty.set(property, compiled);
  }
  if (compiled.result !== 'success') return fallback;
  const v = compiled.value.evaluate({ zoom, globalState } as never);
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Freeboard's own font, with the weight and style the layer asked for. */
export function fskFonts(fonts: string[]): string[] {
  const m =
    /\b(?:(Thin|Light|Regular|Medium|Semibold|Bold|Black)(?: (Italic))?|(Italic))$/i.exec(
      fonts?.[0] ?? ''
    );
  const weight = m?.[1] ?? 'Regular';
  const italic = m?.[2] ?? m?.[3];
  return [`Roboto ${weight}${italic ? ' Italic' : ''}`];
}

/**
 * A vector layer as ol-mapbox-style gets it: `global-state` resolved to the
 * current values, minus any paint or layout property that no longer compiles
 * with them. `global-state` is typed only at runtime, so a value of the wrong
 * type (or an unset variable, null) is a runtime error in MapLibre, which then
 * draws the property's default. Resolved to a literal it becomes a compile
 * error, which ol-mapbox-style throws from inside the render loop, freezing the
 * map. Dropping the property draws its default too. `dropped` lists them.
 */
export function olStyleLayer(
  layer: StyleLayer,
  state: Record<string, unknown>
): { layer: StyleLayer; dropped: string[] } {
  const resolved = resolveLayer(layer, state);
  const dropped: string[] = [];
  for (const part of ['paint', 'layout'] as const) {
    const props = resolved[part];
    if (!props) continue;
    for (const [name, value] of Object.entries(props)) {
      if (
        JSON.stringify(layer[part]?.[name]).includes('"global-state"') &&
        isUnevaluableByOl(part, layer.type, name, value)
      ) {
        delete props[name];
        dropped.push(name);
      }
    }
  }
  return { layer: resolved, dropped };
}
