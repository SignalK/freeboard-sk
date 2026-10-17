import { describe, expect, it } from 'vitest';
import {
  coordTimesOf,
  isStoredTrack,
  storeTrackBody,
  toTrackFeature,
  trackStoreItemPath
} from './track-store';
import { MultiLineStringFeature } from 'src/app/types';

const at = (iso?: string) => ({ datetime: iso ? new Date(iso) : undefined });

describe('coordTimesOf', () => {
  it('nests the point times to match the segments', () => {
    expect(
      coordTimesOf([
        [at('2026-10-01T08:00:00Z'), at('2026-10-01T08:01:00Z')],
        [at('2026-10-01T09:00:00Z')]
      ])
    ).toEqual([
      ['2026-10-01T08:00:00.000Z', '2026-10-01T08:01:00.000Z'],
      ['2026-10-01T09:00:00.000Z']
    ]);
  });

  it('gives no times when any point has none', () => {
    expect(
      coordTimesOf([[at('2026-10-01T08:00:00Z'), at(undefined)]])
    ).toBeUndefined();
    expect(coordTimesOf([[{ datetime: new Date('nope') }]])).toBeUndefined();
  });
});

describe('storeTrackBody', () => {
  const feature: MultiLineStringFeature = {
    type: 'Feature',
    id: 'old',
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [
          [177.4, -17.6, 3],
          [177.5, -17.7]
        ]
      ]
    },
    properties: {
      name: 'Friend',
      description: 'Shared GPX',
      bbox: [0, 0, 1, 1],
      pointCount: 2,
      providerId: 'tracks',
      id: 'tracks:imported:x',
      imported: '2026-10-14T12:00:00.000Z',
      src: null
    }
  };

  it('keeps the metadata and drops what the provider derives', () => {
    expect(storeTrackBody(feature)).toEqual({
      type: 'Feature',
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [177.4, -17.6],
            [177.5, -17.7]
          ]
        ]
      },
      properties: { name: 'Friend', description: 'Shared GPX' }
    });
  });

  it("keeps a file's own point times only when they fit the geometry", () => {
    const fits = [['2026-10-01T08:00:00Z', '2026-10-01T08:01:00Z']];
    const withTimes = (coordTimes: unknown): MultiLineStringFeature => ({
      ...feature,
      properties: { name: 'Friend', coordTimes }
    });
    expect(storeTrackBody(withTimes(fits)).properties.coordTimes).toEqual(fits);
    for (const bad of [
      [['2026-10-01T08:00:00Z']],
      [['2026-10-01T08:00:00Z', 'not a time']],
      ['2026-10-01T08:00:00Z', '2026-10-01T08:01:00Z']
    ]) {
      expect(storeTrackBody(withTimes(bad)).properties).toEqual({
        name: 'Friend'
      });
    }
  });

  it('never takes the vessel from the file', () => {
    const own: MultiLineStringFeature = {
      ...feature,
      properties: {
        name: 'Friend',
        context: 'vessels.urn:mrn:imo:mmsi:123456789',
        contextName: 'Ariadne',
        isSelf: true
      }
    };
    const times = [['2026-10-01T08:00:00Z', '2026-10-01T08:01:00Z']];
    expect(storeTrackBody(own, times).properties).toEqual({
      name: 'Friend',
      coordTimes: times
    });
  });

  it('adds the point times when given', () => {
    const times = [['2026-10-01T08:00:00Z', '2026-10-01T08:01:00Z']];
    expect(storeTrackBody(feature, times).properties.coordTimes).toBe(times);
  });
});

describe('stored tracks', () => {
  it('turns a listed track into a drawable feature keyed by its id', () => {
    const f = toTrackFeature({
      type: 'Feature',
      geometry: { type: 'MultiLineString', coordinates: [[[1, 2]]] },
      properties: {
        id: 'tracks:imported:x',
        imported: '2026-10-14T12:00:00.000Z',
        name: 'A'
      }
    });
    expect(f?.id).toBe('tracks:imported:x');
    expect(f?.properties['imported']).toBe('2026-10-14T12:00:00.000Z');
    expect(isStoredTrack(f)).toBe(true);
  });

  it('marks a stored track the provider does not date, or marks with true', () => {
    for (const imported of [undefined, true] as const) {
      const f = toTrackFeature({
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [[[1, 2]]] },
        properties: { id: 'tracks:imported:x', imported }
      });
      expect(isStoredTrack(f)).toBe(true);
    }
  });

  it('skips a listed track without an id or geometry', () => {
    expect(
      toTrackFeature({
        type: 'Feature',
        geometry: null,
        properties: { id: 'a' }
      })
    ).toBeUndefined();
    expect(
      toTrackFeature({
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [] },
        properties: {}
      })
    ).toBeUndefined();
  });

  it('tells a /resources/tracks track from a stored one', () => {
    expect(
      isStoredTrack({
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [] },
        properties: { name: 'old' }
      })
    ).toBe(false);
  });

  it('encodes the provider-qualified id as one path segment', () => {
    expect(trackStoreItemPath('tracks:imported:a/b')).toBe(
      '/tracks/tracks%3Aimported%3Aa%2Fb'
    );
  });
});
