import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';

import { RasterChartLayerComponent } from './layer-raster-chart.component';
import { MapComponent } from '../map.component';
import { MIN_CHART_REFRESH_INTERVAL_MS } from './chart-utils';
import { SKChart } from 'src/app/modules/skresources/resource-classes';
import { FBChart } from 'src/app/types';

/**
 * A time-varying raster chart shows the instant selected on its cache entry
 * (`timeValue`), through the resource's `time.url` template, and returns to
 * the plain `url` for live. A historical frame does not change, so the
 * chart's auto-refresh timer must stand still while an instant is shown and
 * pick up again on return to live.
 */
describe('RasterChartLayerComponent — time-varying chart', () => {
  const T0 = '2026-09-18T12:00:00.000Z';
  const REFRESH = 2 * MIN_CHART_REFRESH_INTERVAL_MS;
  const map = { addLayer: vi.fn(), removeLayer: vi.fn(), render: vi.fn() };

  const radar = (timeValue: string | null): FBChart => {
    const chart = new SKChart({
      name: 'Radar',
      url: 'https://r.test/{z}/{x}/{y}.png',
      type: 'tilelayer',
      format: 'png',
      refreshInterval: REFRESH,
      time: {
        url: 'https://r.test/{z}/{x}/{y}.png?t={time}',
        current: true,
        from: T0,
        to: '2026-09-18T15:00:00.000Z',
        step: 300000
      }
    });
    chart.timeValue = timeValue;
    return ['radar', chart, true];
  };

  const source = (): XYZ =>
    (map.addLayer.mock.calls[0][0] as TileLayer).getSource() as XYZ;
  const tileUrl = (src: XYZ) =>
    src.getTileUrlFunction()([3, 1, 2], 1, src.getProjection());

  const render = (chart: FBChart) => {
    const fixture = TestBed.createComponent(RasterChartLayerComponent);
    fixture.componentRef.setInput('chart', chart);
    fixture.componentRef.setInput('zIndex', 10);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    map.addLayer.mockReset();
    map.removeLayer.mockReset();
    map.render.mockReset();
    await TestBed.configureTestingModule({
      declarations: [RasterChartLayerComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  afterEach(() => vi.useRealTimers());

  it('draws the live frame from the plain url, auto-refreshing', () => {
    render(radar(null));
    const src = source();
    expect(tileUrl(src)).toBe('https://r.test/3/1/2.png');
    const key = src.getKey();
    vi.advanceTimersByTime(REFRESH);
    expect(src.getKey()).not.toBe(key);
  });

  it('retargets the source to the selected instant and suspends the refresh', () => {
    const fixture = render(radar(null));
    fixture.componentRef.setInput('chart', radar(T0));
    fixture.detectChanges();
    const src = source();
    expect(tileUrl(src)).toBe(
      'https://r.test/3/1/2.png?t=2026-09-18T12%3A00%3A00.000Z'
    );
    const key = src.getKey();
    vi.advanceTimersByTime(REFRESH * 3);
    expect(src.getKey()).toBe(key); // no refresh ticks while scrubbed
  });

  it('returns to live and resumes the refresh', () => {
    const fixture = render(radar(T0));
    fixture.componentRef.setInput('chart', radar(null));
    fixture.detectChanges();
    const src = source();
    expect(tileUrl(src)).toBe('https://r.test/3/1/2.png');
    const key = src.getKey();
    vi.advanceTimersByTime(REFRESH);
    expect(src.getKey()).not.toBe(key);
  });

  it('keeps the same layer across the swap (no blank while the frame loads)', () => {
    const fixture = render(radar(null));
    fixture.componentRef.setInput('chart', radar(T0));
    fixture.detectChanges();
    expect(map.addLayer).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).not.toHaveBeenCalled();
  });

  it('stops the refresh timer when destroyed', () => {
    const fixture = render(radar(null));
    const src = source();
    fixture.destroy();
    const key = src.getKey();
    vi.advanceTimersByTime(REFRESH * 3);
    expect(src.getKey()).toBe(key);
  });
});
