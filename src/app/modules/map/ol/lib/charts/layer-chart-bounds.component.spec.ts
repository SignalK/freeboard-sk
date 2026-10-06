import { ChangeDetectorRef } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { transform } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';

import { ChartBoundsLayerComponent } from './layer-chart-bounds.component';
import { MapComponent } from '../map.component';

/**
 * The Bounds outline draws each chart's bounds as a rectangle running east from
 * the west edge to the east edge, however wide. Bounds whose west edge lies
 * east of their east edge cross the antimeridian (RFC 7946 §5.2) and run east
 * across 180.
 */
describe('ChartBoundsLayerComponent — bounds outline', () => {
  const outline = new ChartBoundsLayerComponent(
    {} as MapComponent,
    { detach: () => undefined } as unknown as ChangeDetectorRef
  );

  /** Longitudes of the outline's ring, back in degrees and not wrapped. */
  const ringLons = (bounds: number[]): number[] => {
    const [ring] = outline.parseBoundsCoordinates(bounds) as Coordinate[][];
    return ring.map((c) => transform(c, 'EPSG:3857', 'EPSG:4326')[0]);
  };

  const westEast = (bounds: number[]): [number, number] => {
    const lons = ringLons(bounds);
    return [Math.min(...lons), Math.max(...lons)];
  };

  it('draws a box that crosses the antimeridian eastward across 180', () => {
    const [west, east] = westEast([174.6, -21.9, -178.2, -11.2]);
    expect(west).toBeCloseTo(174.6, 6);
    expect(east).toBeCloseTo(181.8, 6);
  });

  it('draws an ordinary box as given', () => {
    const [west, east] = westEast([10, 40, 20, 50]);
    expect(west).toBeCloseTo(10, 6);
    expect(east).toBeCloseTo(20, 6);
  });

  it('draws an ordinary box wider than 180 degrees at its full width', () => {
    const [west, east] = westEast([-170, 0, 170, 10]);
    expect(west).toBeCloseTo(-170, 6);
    expect(east).toBeCloseTo(170, 6);
  });

  it('draws bounds that span every longitude around the whole world', () => {
    const [west, east] = westEast([-180, -80, 180, 80]);
    expect(west).toBeCloseTo(-180, 6);
    expect(east).toBeCloseTo(180, 6);
  });

  it('draws a crossing box wider than 180 degrees at its full width', () => {
    const [west, east] = westEast([10, 0, 0, 10]);
    expect(west).toBeCloseTo(10, 6);
    expect(east).toBeCloseTo(360, 6);
  });

  it('draws nothing for whole-world bounds', () => {
    expect(outline.parseBoundsCoordinates([-180, -90, 180, 90])).toEqual([]);
  });
});
