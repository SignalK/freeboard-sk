import { describe, it, expect } from 'vitest';
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
