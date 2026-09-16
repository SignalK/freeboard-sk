import { describe, it, expect } from 'vitest';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { Coordinate } from '../models';
import { AISTargetsTrackLayerComponent } from './layer-aistargets-track.component';

/**
 * The AIS / aircraft track layer must not render tracks below `tracksMinZoom`
 * (#706). Both entry points that add track features — `reloadTracks()` on a
 * full reload and `onUpdateTargets()` on an incremental AIS update — are
 * gated by `okToRenderTracks()`. The gate had never applied because both
 * guards tested the method *reference* (always truthy) instead of calling it.
 *
 * Rendering also depends on `parseCoordinates()` reading the track at the
 * right depth: a track is a MultiLineString's coordinates (Array<Position[]>),
 * and iterating one level too deep hands single positions to `mapifyCoords()`,
 * which throws since #570 — so no track could render at any zoom.
 *
 * The methods only touch plain fields and the OL vector source, so exercise
 * them on a bare prototype instance with a real `VectorSource` — no Angular
 * DI needed (same approach as ais-base.component.spec).
 */
const ID = 'vessels.urn:mrn:imo:mmsi:123456789';
// one line of two positions — the shape `SKVessel.track` (Array<Position[]>)
// carries, i.e. a MultiLineString's coordinates.
const TRACK: Coordinate[][] = [
  [
    [-80.1, 25.7],
    [-80.2, 25.8]
  ]
];

function layer(mapZoom: number, tracksMinZoom = 10) {
  const c = Object.create(
    AISTargetsTrackLayerComponent.prototype
  ) as AISTargetsTrackLayerComponent;
  Object.assign(c, {
    source: new VectorSource(),
    tracks: new Map([[ID, TRACK]]),
    targetContext: 'vessels',
    showAll: true,
    selectedIds: [],
    showTracks: true,
    mapZoom,
    tracksMinZoom
  });
  return c as unknown as AISTargetsTrackLayerComponent & {
    source: VectorSource;
  };
}

describe('AISTargetsTrackLayerComponent minimum-zoom gate (#706)', () => {
  it('okToRenderTracks() is false below tracksMinZoom and true at/above it', () => {
    expect(layer(9).okToRenderTracks()).toBe(false);
    expect(layer(10).okToRenderTracks()).toBe(true);
    expect(layer(14).okToRenderTracks()).toBe(true);
  });

  it('reloadTracks() adds no track features below tracksMinZoom', () => {
    const c = layer(9);
    c.reloadTracks();
    expect(c.source.getFeatures()).toHaveLength(0);
  });

  it('reloadTracks() renders the track at or above tracksMinZoom', () => {
    const c = layer(10);
    c.reloadTracks();
    expect(c.source.getFeatures()).toHaveLength(1);
    expect(c.source.getFeatureById('track-' + ID)).not.toBeNull();
  });

  it('onUpdateTargets() adds no track features below tracksMinZoom', () => {
    const c = layer(9);
    c.onUpdateTargets([ID]);
    expect(c.source.getFeatures()).toHaveLength(0);
  });

  it('onUpdateTargets() renders the track at or above tracksMinZoom', () => {
    const c = layer(12);
    c.onUpdateTargets([ID]);
    expect(c.source.getFeatures()).toHaveLength(1);
  });

  it('honours a non-default tracksMinZoom', () => {
    const c = layer(12, 13);
    c.reloadTracks();
    expect(c.source.getFeatures()).toHaveLength(0);
  });
});

describe('AISTargetsTrackLayerComponent.parseCoordinates', () => {
  it('projects each line of a MultiLineString track (Array<Position[]>)', () => {
    const c = layer(12);
    const lines = c.parseCoordinates(TRACK) as number[][][];
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(2);
    expect(lines[0][0]).toEqual(fromLonLat([-80.1, 25.7]));
    expect(lines[0][1]).toEqual(fromLonLat([-80.2, 25.8]));
  });

  it('unwraps a line crossing the dateline so it does not span the world', () => {
    const c = layer(12);
    const dateline: Coordinate[][] = [
      [
        [179, 0],
        [-179, 0]
      ]
    ];
    const lines = c.parseCoordinates(dateline) as number[][][];
    // -179 is unwrapped to 181, so the second x lands just east of the first
    expect(lines[0][1][0]).toBeGreaterThan(lines[0][0][0]);
  });

  it('renders a track feature with the parsed multi-line geometry', () => {
    const c = layer(12);
    c.addTrackWithId(ID);
    const f = c.source.getFeatureById('track-' + ID);
    expect(f).not.toBeNull();
    expect(f.getGeometry().getType()).toBe('MultiLineString');
  });
});
