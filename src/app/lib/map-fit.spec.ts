import { describe, expect, it } from 'vitest';
import { bboxInView, fitBbox } from './map-fit';

describe('fitBbox', () => {
  const limits = { min: 2, max: 16 };

  it('centres a box and picks the zoom that fits it with a margin', () => {
    // a quarter of the world wide, on the equator, in a 1024-pixel map
    const fit = fitBbox([-45, -1, 45, 1], [1024, 1024], limits);
    expect(fit.center[0]).toBeCloseTo(0, 9);
    expect(fit.center[1]).toBeCloseTo(0, 9);
    // zoom 2 draws the world 1024 pixels wide, so a quarter of it is 256;
    // filling 85% of 1024 pixels needs log2(0.85 * 4) more
    expect(fit.zoom).toBeCloseTo(2 + Math.log2(0.85 * 4), 6);
  });

  it('fits by the tighter side of the map', () => {
    const wide = fitBbox([-45, -1, 45, 1], [1024, 1024], limits);
    const narrow = fitBbox([-45, -1, 45, 1], [512, 1024], limits);
    expect(narrow.zoom).toBeCloseTo(wide.zoom - 1, 6);
  });

  it('centres on the Mercator middle, not the average latitude', () => {
    const fit = fitBbox([0, 0, 1, 60], [1000, 1000], limits);
    expect(fit.center[1]).toBeGreaterThan(30);
    expect(fit.center[1]).toBeLessThan(60);
  });

  it('centres a box crossing the antimeridian near 180, not Greenwich', () => {
    const fit = fitBbox([178, -18, -178, -16], [1000, 1000], limits);
    expect(Math.abs(fit.center[0])).toBeCloseTo(180, 6);
    // four degrees wide, not 356
    const same = fitBbox([-2, -18, 2, -16], [1000, 1000], limits);
    expect(fit.zoom).toBeCloseTo(same.zoom, 6);
    const east = fitBbox([176, -18, -178, -16], [1000, 1000], limits);
    expect(east.center[0]).toBeCloseTo(179, 6);
    const west = fitBbox([178, -18, -176, -16], [1000, 1000], limits);
    expect(west.center[0]).toBeCloseTo(-179, 6);
  });

  it('fits the box as it lies on a rotated map', () => {
    const box: [number, number, number, number] = [-45, -1, 45, 1];
    const turned = fitBbox(box, [512, 1024], limits, Math.PI / 2);
    // a quarter turn lays the wide box along the tall side of the map
    const upright = fitBbox(box, [1024, 512], limits);
    expect(turned.zoom).toBeCloseTo(upright.zoom, 6);
    expect(turned.center).toEqual(upright.center);
    // half a turn changes nothing
    const half = fitBbox(box, [1024, 512], limits, Math.PI);
    expect(half.zoom).toBeCloseTo(upright.zoom, 6);
  });

  it('zooms a single point to the limit, and never past either limit', () => {
    expect(fitBbox([-81, 24, -81, 24], [1000, 800], limits).zoom).toBe(16);
    expect(fitBbox([-180, -80, 180, 80], [300, 300], limits).zoom).toBe(2);
  });
});

describe('bboxInView', () => {
  it('knows a box in, beside and away from the view', () => {
    const view = [-82, 24, -81, 25];
    expect(bboxInView([-81.5, 24.5, -81.4, 24.6], view)).toBe(true);
    expect(bboxInView([-83, 23, -80, 26], view)).toBe(true); // around it
    expect(bboxInView([-81.1, 24.9, -80, 26], view)).toBe(true); // corner
    expect(bboxInView([-80.9, 24.5, -80, 24.6], view)).toBe(false); // east
    expect(bboxInView([-81.5, 25.1, -81.4, 26], view)).toBe(false); // north
    expect(bboxInView([-81.5, 24.5, -81.4, 24.6], null)).toBe(false);
  });

  it('matches across the antimeridian and in other world copies', () => {
    // a view straddling 180, as OL reports it: past +180
    const fiji = [175, -20, 185, -15];
    expect(bboxInView([-179, -18, -178, -17], fiji)).toBe(true);
    expect(bboxInView([178, -18, -178, -16], fiji)).toBe(true);
    expect(bboxInView([100, -18, 101, -17], fiji)).toBe(false);
    // the same place one world west
    expect(bboxInView([-81.5, 24.5, -81.4, 24.6], [-442, 24, -441, 25])).toBe(
      true
    );
    // a view wider than the world holds everything at its latitudes
    expect(bboxInView([10, 0, 11, 1], [-300, -10, 300, 10])).toBe(true);
  });
});
