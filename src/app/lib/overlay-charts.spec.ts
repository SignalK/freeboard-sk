import { describe, it, expect } from 'vitest';
import {
  chartFromOverlay,
  isOverlayResource,
  overlayChartId,
  overlayIdFromChartId
} from './overlay-charts';
import { InfoLayerResource } from 'src/app/types';

/**
 * #784: a legacy Overlay (`infolayers` entry) is presented as a chart. The
 * mapping is what lets an existing radar layer carry over with nothing done
 * by the user, so it is pinned field by field.
 */
const T0 = '2026-09-18T12:00:00.000Z';
const T1 = '2026-09-18T13:00:00.000Z';

const radarOverlay = (): InfoLayerResource => ({
  id: 'e2b5a6d0-1111-4222-8333-444455556666',
  name: 'NEXRAD',
  description: 'Weather radar',
  type: 'InfoLayer',
  values: {
    url: 'https://wms.example/radar',
    sourceType: 'WMS',
    layers: ['nexrad-n0q'],
    opacity: 0.6,
    minZoom: 4,
    maxZoom: 14,
    refreshInterval: 300000,
    time: { current: T1, from: T0, to: T1, interval: 300000, values: [] }
  }
});

describe('overlay chart ids', () => {
  it('derives a deterministic chart id the server accepts', () => {
    const id = overlayChartId('e2b5a6d0-1111-4222-8333-444455556666');
    expect(id).toBe('overlay-e2b5a6d0-1111-4222-8333-444455556666');
    // the server's chart id rule (validate.chartId)
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,}$/);
  });

  it('recovers the Overlay id from an adopted chart id, and only from one', () => {
    expect(overlayIdFromChartId('overlay-abc')).toBe('abc');
    expect(overlayIdFromChartId('overlay-')).toBeUndefined();
    expect(overlayIdFromChartId('openseamap')).toBeUndefined();
    expect(
      overlayIdFromChartId(undefined as unknown as string)
    ).toBeUndefined();
  });
});

describe('isOverlayResource', () => {
  it('accepts an InfoLayer with values and rejects anything else', () => {
    expect(isOverlayResource(radarOverlay())).toBe(true);
    expect(isOverlayResource({ type: 'InfoLayer' })).toBe(false);
    expect(isOverlayResource({ type: 'ResourceSet', values: {} })).toBe(false);
    expect(isOverlayResource(null)).toBe(false);
  });

  it('rejects an Overlay with no source URL, which no chart can be built on', () => {
    const noUrl = radarOverlay();
    delete noUrl.values.url;
    expect(isOverlayResource(noUrl)).toBe(false);
    noUrl.values.url = '  ';
    expect(isOverlayResource(noUrl)).toBe(false);
  });
});

describe('chartFromOverlay', () => {
  it('maps every Overlay field to its chart counterpart', () => {
    const chart = chartFromOverlay('ov1', radarOverlay());
    expect(chart).toMatchObject({
      identifier: 'overlay-ov1',
      name: 'NEXRAD',
      description: 'Weather radar',
      type: 'WMS',
      url: 'https://wms.example/radar',
      layers: ['nexrad-n0q'],
      defaultOpacity: 0.6,
      minzoom: 4,
      maxzoom: 14,
      // both are milliseconds, so the interval carries across as-is
      refreshInterval: 300000
    });
  });

  it('is served by resources-provider, so the chart list offers Remove', () => {
    expect(chartFromOverlay('ov1', radarOverlay()).$source).toBe(
      'resources-provider'
    );
  });

  it('maps sourceType WMTS to WMTS and anything else (xyz) to tilelayer', () => {
    const wmts = radarOverlay();
    wmts.values.sourceType = 'WMTS';
    expect(chartFromOverlay('ov1', wmts).type).toBe('WMTS');
    const xyz = radarOverlay();
    (xyz.values as { sourceType: string }).sourceType = 'xyz';
    expect(chartFromOverlay('ov1', xyz).type).toBe('tilelayer');
  });

  it('carries a time dimension across as a chart time block', () => {
    // A WMS Overlay with a time dimension becomes a time-varying chart: the
    // chart components then show the Time action for it.
    const chart = chartFromOverlay('ov1', radarOverlay());
    expect(chart.time).toEqual({
      current: true,
      from: T0,
      to: T1,
      step: 300000
    });
  });

  it('omits the time block, interval and zoom range when the Overlay has none', () => {
    const plain = radarOverlay();
    delete plain.values.time;
    plain.values.refreshInterval = 0;
    delete plain.values.minZoom;
    delete plain.values.maxZoom;
    const chart = chartFromOverlay('ov1', plain);
    expect(chart.time).toBeUndefined();
    expect(chart.refreshInterval).toBeUndefined();
    expect(chart.minzoom).toBeUndefined();
    expect(chart.maxzoom).toBeUndefined();
  });

  it('does not share the layers array with the Overlay', () => {
    const overlay = radarOverlay();
    const chart = chartFromOverlay('ov1', overlay);
    chart.layers.push('other');
    expect(overlay.values.layers).toEqual(['nexrad-n0q']);
  });
});
