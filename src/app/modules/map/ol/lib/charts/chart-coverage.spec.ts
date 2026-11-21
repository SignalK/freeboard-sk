import { describe, expect, it } from 'vitest';
import { get as getProjection } from 'ol/proj';
import Projection from 'ol/proj/Projection';
import TileGrid from 'ol/tilegrid/TileGrid';
import { createXYZ } from 'ol/tilegrid';

import {
  coverageEntries,
  entriesAt,
  insideCoverage,
  isXyzGrid
} from './chart-coverage';

const coverage = [
  { minzoom: 9, maxzoom: 12, tiles: ['10/315/381'] },
  { minzoom: 12, tiles: ['13/2485/3060'] }
];

describe('coverageEntries', () => {
  it('reads the entries, without a maxzoom for every zoom above', () => {
    const entries = coverageEntries(coverage);
    expect(entries.map((e) => [e.minzoom, e.maxzoom])).toEqual([
      [9, 12],
      [12, Infinity]
    ]);
    expect(coverageEntries(coverage)).toBe(entries);
  });

  it('leaves out what it cannot read', () => {
    expect(coverageEntries(undefined)).toEqual([]);
    expect(coverageEntries({})).toEqual([]);
    expect(
      coverageEntries([
        { minzoom: '9', tiles: ['9/1/1'] },
        { minzoom: 9, tiles: ['9/1'] },
        { minzoom: 9, maxzoom: 'x', tiles: ['9/1/1'] },
        null
      ])
    ).toEqual([]);
  });
});

describe('entriesAt', () => {
  it('keeps the entries that hold at a level', () => {
    const entries = coverageEntries(coverage);
    expect(entriesAt(entries, 8)).toEqual([]);
    expect(entriesAt(entries, 10)).toEqual([entries[0]]);
    expect(entriesAt(entries, 12)).toEqual(entries);
    expect(entriesAt(entries, 20)).toEqual([entries[1]]);
  });
});

describe('insideCoverage', () => {
  const entries = coverageEntries(coverage);

  it('finds a listed tile and the tiles inside it', () => {
    expect(insideCoverage(entries, 10, 315, 381)).toBe(true);
    expect(insideCoverage(entries, 14, 315 * 16 + 5, 381 * 16 + 15)).toBe(true);
    expect(insideCoverage(entries, 13, 2485, 3060)).toBe(true);
  });

  it('leaves out its neighbours and the tile a listed one lies in', () => {
    expect(insideCoverage(entries, 10, 316, 381)).toBe(false);
    expect(insideCoverage(entries, 9, 157, 190)).toBe(false);
  });

  it('counts a column of a world copy as the same tile', () => {
    expect(insideCoverage(entries, 10, 315 + 1024, 381)).toBe(true);
    expect(insideCoverage(entries, 10, 315 - 1024, 381)).toBe(true);
  });
});

describe('isXyzGrid', () => {
  const mercator = getProjection('EPSG:3857') as Projection;

  it('accepts XYZ grids of 256 and 512 pixel tiles', () => {
    expect(isXyzGrid(createXYZ())).toBe(true);
    expect(isXyzGrid(createXYZ({ tileSize: 512, maxZoom: 18 }))).toBe(true);
  });

  it('refuses a grid of its own', () => {
    const own = new TileGrid({
      extent: mercator.getExtent(),
      resolutions: createXYZ()
        .getResolutions()
        .map((r) => r * 1.2)
    });
    expect(isXyzGrid(own)).toBe(false);
    const bottomLeft = new TileGrid({
      origin: [-20037508.342789244, -20037508.342789244],
      resolutions: createXYZ().getResolutions()
    });
    expect(isXyzGrid(bottomLeft)).toBe(false);
  });
});
