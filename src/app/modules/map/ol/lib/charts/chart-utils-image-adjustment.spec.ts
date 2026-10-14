import { describe, it, expect } from 'vitest';
import BaseEvent from 'ol/events/Event';
import TileLayer from 'ol/layer/Tile';
import {
  attachImageAdjustmentFilter,
  chartLayerClassName,
  followImageFilter,
  IMAGE_FILTER,
  imageAdjustmentToFilter
} from './chart-utils';

describe('imageAdjustmentToFilter (#457)', () => {
  it('returns an empty string when no adjustment is supplied', () => {
    expect(imageAdjustmentToFilter(undefined)).toBe('');
  });

  it('returns an empty string for a neutral adjustment (no filter applied)', () => {
    expect(imageAdjustmentToFilter({ brightness: 1, contrast: 1 })).toBe('');
  });

  it('builds a CSS filter string for a non-neutral adjustment', () => {
    expect(imageAdjustmentToFilter({ brightness: 1.3, contrast: 0.7 })).toBe(
      'brightness(1.3) contrast(0.7)'
    );
  });

  it('treats a single changed channel as non-neutral', () => {
    expect(imageAdjustmentToFilter({ brightness: 1.2, contrast: 1 })).toBe(
      'brightness(1.2) contrast(1)'
    );
  });

  it('clamps a negative channel to 0 rather than emitting an invalid filter', () => {
    expect(imageAdjustmentToFilter({ brightness: -1, contrast: 1 })).toBe(
      'brightness(0) contrast(1)'
    );
  });
});

/** A real tile layer, with a way to fire its render events by hand. */
function testLayer() {
  const layer = new TileLayer({});
  const fire = (type: string, context: unknown) =>
    layer.dispatchEvent({ type, context } as unknown as BaseEvent);
  return { layer, fire };
}

/** A real canvas element so the HTMLCanvasElement guard in the helper passes. */
function canvasContext() {
  const canvas = document.createElement('canvas');
  return { canvas, ctx: { canvas } };
}

describe('attachImageAdjustmentFilter (#457)', () => {
  it('applies the adjustment as a CSS filter on the layer canvas', () => {
    const { layer, fire } = testLayer();
    const setAdjustment = attachImageAdjustmentFilter(layer);
    setAdjustment({ brightness: 1.2, contrast: 0.8 });

    const { canvas, ctx } = canvasContext();
    fire('postrender', ctx);
    expect(canvas.style.filter).toBe('brightness(1.2) contrast(0.8)');
  });

  it('updates the CSS filter immediately once the canvas is known', () => {
    const { layer, fire } = testLayer();
    const setAdjustment = attachImageAdjustmentFilter(layer);
    const { canvas, ctx } = canvasContext();
    fire('postrender', ctx);

    setAdjustment({ brightness: 1.5, contrast: 1.1 });
    expect(canvas.style.filter).toBe('brightness(1.5) contrast(1.1)');
  });

  it('clears the CSS filter for a neutral adjustment', () => {
    const { layer, fire } = testLayer();
    const setAdjustment = attachImageAdjustmentFilter(layer);
    const { canvas, ctx } = canvasContext();
    setAdjustment({ brightness: 1.2, contrast: 0.8 });
    fire('postrender', ctx);

    setAdjustment({ brightness: 1, contrast: 1 });
    expect(canvas.style.filter).toBe('');
  });

  it('ignores a non-canvas render context (WebGL layers)', () => {
    const { layer, fire } = testLayer();
    const setAdjustment = attachImageAdjustmentFilter(layer);
    setAdjustment({ brightness: 1.2, contrast: 0.8 });
    expect(() => fire('postrender', { canvas: {} })).not.toThrow();
  });
});

describe('followImageFilter', () => {
  it('filters a copy of the layer the same way once it has the property', () => {
    const { layer } = testLayer();
    const setAdjustment = attachImageAdjustmentFilter(layer);
    setAdjustment({ brightness: 0.3, contrast: 1 });
    // The split view's second pane copies layer properties to a twin.
    const { layer: twin, fire } = testLayer();
    followImageFilter(twin);
    twin.set(IMAGE_FILTER, layer.get(IMAGE_FILTER));

    const { canvas, ctx } = canvasContext();
    fire('postrender', ctx);
    expect(canvas.style.filter).toBe('brightness(0.3) contrast(1)');
  });
});

describe('chartLayerClassName (#457)', () => {
  it('produces a unique per-chart class retaining ol-layer', () => {
    expect(chartLayerClassName('my-chart')).toBe('ol-layer chart-my-chart');
    expect(chartLayerClassName('a')).not.toBe(chartLayerClassName('b'));
  });

  it('sanitises characters not valid in a class name', () => {
    expect(chartLayerClassName('a/b.c d')).toBe('ol-layer chart-a-b-c-d');
  });
});
