import { describe, it, expect, vi } from 'vitest';
import { SKChart } from './resource-classes';

/**
 * `SKChart` is constructed from a server chart resource, which spells its zoom
 * bounds `minzoom`/`maxzoom` and its source `$source`. The instance spells them
 * `minZoom`/`maxZoom`/`source`, so re-constructing from an existing instance --
 * how the chart cache clones an entry to trigger a re-render -- must not fall
 * back to the class defaults and drop those fields.
 */
describe('SKChart', () => {
  it('keeps the declared zoom range when cloning an instance', () => {
    const original = new SKChart({
      name: 'Rannikkokartat',
      url: 'http://x/{z}/{x}/{y}.png',
      minzoom: 9,
      maxzoom: 13
    });

    const clone = new SKChart(original);

    expect(clone.minZoom).toBe(9);
    expect(clone.maxZoom).toBe(13);
  });

  it('keeps a local display minimum zoom when cloning an instance', () => {
    // The chart list clones through SKChart after the minimum is applied, so
    // losing it here takes the row's own label and hidden state with it.
    const original = new SKChart({
      name: 'Local chart',
      url: 'http://x/{z}/{x}/{y}.png'
    });
    original.displayMinZoom = 10;

    expect(new SKChart(original).displayMinZoom).toBe(10);
  });

  it('carries a time dimension from the resource and when cloning', () => {
    // Dropped here, a temporal chart loses its Time control on the first
    // re-render (opacity, min zoom …) — the constructor is a whitelist.
    const time = {
      url: 'http://x/{z}/{x}/{y}.png?t={time}',
      current: true,
      from: '2026-09-18T12:00:00Z',
      to: '2026-09-18T15:00:00Z',
      step: 300000
    };
    const original = new SKChart({
      name: 'Radar',
      url: 'http://x/{z}/{x}/{y}.png',
      time
    });
    expect(original.time).toEqual(time);
    expect(new SKChart(original).time).toEqual(time);
  });

  it('starts live and keeps a selected instant when cloning', () => {
    const original = new SKChart({
      name: 'Radar',
      url: 'http://x/{z}/{x}/{y}.png',
      time: {
        current: true,
        from: '2026-09-18T12:00:00Z',
        to: '2026-09-18T15:00:00Z'
      }
    });
    expect(original.timeValue).toBeNull();
    original.timeValue = '2026-09-18T13:00:00Z';
    expect(new SKChart(original).timeValue).toBe('2026-09-18T13:00:00Z');
    // Back to live is a value too, not an absence.
    original.timeValue = null;
    expect(new SKChart(original).timeValue).toBeNull();
  });

  it('starts an archival source (current: false) at its newest frame', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T13:59:00Z'));
    try {
      const chart = new SKChart({
        name: 'Archive',
        url: 'http://x/{z}/{x}/{y}.png',
        time: {
          current: false,
          from: '2026-09-18T12:00:00Z',
          to: '2026-09-18T15:00:00Z',
          step: 3600000
        }
      });
      // The frame at (or before) now, not the declared end still to come.
      expect(chart.timeValue).toBe('2026-09-18T13:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the source when cloning an instance', () => {
    const original = new SKChart({
      name: 'Local chart',
      url: 'http://x/{z}/{x}/{y}.png',
      $source: 'resources-provider'
    });

    expect(new SKChart(original).source).toBe('resources-provider');
  });

  it('reads the zoom range and source from a server chart resource', () => {
    const chart = new SKChart({
      name: 'Merikarttasarjat',
      url: 'http://x/{z}/{x}/{y}.png',
      minzoom: 5,
      maxzoom: 15,
      $source: 'charts-plugin'
    });

    expect(chart.minZoom).toBe(5);
    expect(chart.maxZoom).toBe(15);
    expect(chart.source).toBe('charts-plugin');
  });

  it('honours a declared minimum of 0 rather than treating it as absent', () => {
    const chart = new SKChart({
      name: 'World',
      url: 'http://x/{z}/{x}/{y}.png',
      minzoom: 0,
      maxzoom: 0
    });

    expect(new SKChart(chart).minZoom).toBe(0);
    expect(new SKChart(chart).maxZoom).toBe(0);
  });

  it('falls back to the class defaults when no range is declared', () => {
    const chart = new SKChart({
      name: 'No range',
      url: 'http://x/{z}/{x}/{y}.png'
    });

    expect(chart.minZoom).toBe(0);
    expect(chart.maxZoom).toBe(24);
    expect(new SKChart(chart).minZoom).toBe(0);
    expect(new SKChart(chart).maxZoom).toBe(24);
  });
});
