import { describe, it, expect, vi } from 'vitest';
import TileLayer from 'ol/layer/Tile';
import {
  attachImageAdjustmentFilter,
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

/** Minimal OL layer/render-context stand-ins for the prerender/postrender hooks. */
function mockLayer() {
  const handlers: Record<string, (e: { context: unknown }) => void> = {};
  const layer = {
    on: (type: string, cb: (e: { context: unknown }) => void) => {
      handlers[type] = cb;
    }
  } as unknown as TileLayer;
  const fire = (type: string, context: unknown) =>
    handlers[type]?.({ context });
  return { layer, fire };
}

function mockContext() {
  return {
    filter: 'none',
    save: vi.fn(),
    restore: vi.fn()
  } as unknown as CanvasRenderingContext2D & {
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };
}

describe('attachImageAdjustmentFilter (#457)', () => {
  it('applies the filter on prerender and restores it on postrender', () => {
    const { layer, fire } = mockLayer();
    const setAdjustment = attachImageAdjustmentFilter(layer);
    setAdjustment({ brightness: 1.2, contrast: 0.8 });

    const ctx = mockContext();
    fire('prerender', ctx);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.filter).toBe('brightness(1.2) contrast(0.8)');

    fire('postrender', ctx);
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('leaves the context untouched for a neutral adjustment', () => {
    const { layer, fire } = mockLayer();
    const setAdjustment = attachImageAdjustmentFilter(layer);
    setAdjustment({ brightness: 1, contrast: 1 });

    const ctx = mockContext();
    fire('prerender', ctx);
    fire('postrender', ctx);
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.restore).not.toHaveBeenCalled();
    expect(ctx.filter).toBe('none');
  });
});
