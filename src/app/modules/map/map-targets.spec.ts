import { describe, expect, it } from 'vitest';
import Feature, { type FeatureLike } from 'ol/Feature';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

import { LineString } from 'ol/geom';
import {
  chartFeatureTarget,
  featureTarget,
  overlayFeatureTarget,
  positionTarget,
  type TargetOverlay,
  type TargetSources
} from './map-targets';
import type { OverlayHit } from './ol/lib/data-overlay/overlay-hits';
import {
  SKAtoN,
  SKNote,
  SKRoute,
  SKTrack,
  SKVessel,
  SKWaypoint
} from '../skresources/resource-classes';
import type { RouteBuffer } from '../plotterext/route-buffer.registry';

const waypoint = new SKWaypoint({
  name: 'Fuel dock',
  feature: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-80.12, 25.77] },
    properties: {}
  }
} as never);
const note = new SKNote({
  name: 'Anchorage',
  position: { latitude: 25.7, longitude: -80.2 },
  properties: { skIcon: 'anchorage' }
} as never);
const route = new SKRoute({ name: 'Home' } as never);
const resourceTrack = new SKTrack({
  feature: {
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates: [] },
    properties: { name: 'Old passage' }
  }
} as never);
const storedTrack = new SKTrack({
  feature: {
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates: [] },
    properties: { name: 'Imported', imported: '2026-10-01T00:00:00Z' }
  }
} as never);
const self = Object.assign(new SKVessel(), {
  name: 'eSea Street',
  position: [-80.1, 25.7]
});
const ais = Object.assign(new SKVessel(), {
  name: 'Tanker',
  mmsi: '367123450',
  position: [-80.0, 25.6]
});
const aton = Object.assign(new SKAtoN(), {
  name: 'Fowey Rocks',
  position: [-80.1, 25.59]
});

const draft = (saved: boolean): RouteBuffer => ({
  routeId: 'r-1',
  name: saved ? 'Home' : null,
  description: null,
  rev: 1,
  saved,
  dirty: true,
  ...(saved ? { href: 'route-1' } : {}),
  points: []
});

const sources = (over: Partial<TargetSources> = {}): TargetSources => ({
  waypoint: (id) => (id === 'w1' ? ['w1', waypoint] : undefined),
  note: (id) => (id === 'n1' ? ['n1', note] : undefined),
  route: (id) => (id === 'route-1' ? ['route-1', route] : undefined),
  region: () => undefined,
  track: (id) =>
    id === 't1'
      ? ['t1', resourceTrack]
      : id === 'tracks:imported:abc'
        ? ['tracks:imported:abc', storedTrack]
        : undefined,
  draftRoute: () => undefined,
  visibleRouteId: (id) => (id === 'route-1' ? 'r-9' : undefined),
  self: () => self,
  vessel: (c) => (c === 'vessels.urn:mrn:imo:mmsi:367123450' ? ais : undefined),
  aton: (c) => (c === 'atons.urn:mrn:imo:mmsi:993672001' ? aton : undefined),
  ...over
});

const at: [number, number] = [-80.11, 25.76];

describe('positionTarget', () => {
  it('is the selected point, longitude in [-180, 180]', () => {
    expect(positionTarget([370.5, 10]).target).toEqual({
      kind: 'position',
      position: [10.5, 10]
    });
  });
});

describe('featureTarget', () => {
  it('makes a waypoint target from the cache, with its own position', () => {
    const t = featureTarget('waypoint.w1', at, sources());
    expect(t?.target).toEqual({
      kind: 'waypoint',
      position: at,
      id: 'w1',
      href: '/resources/waypoints/w1',
      name: 'Fuel dock',
      featurePosition: [-80.12, 25.77]
    });
    expect(t?.match).toBe(waypoint);
    expect(t?.label).toBe('Fuel dock');
  });

  it('takes a note position from its latitude and longitude', () => {
    const t = featureTarget('note.n1', at, sources());
    expect(t?.target).toMatchObject({
      kind: 'note',
      href: '/resources/notes/n1',
      featurePosition: [-80.2, 25.7]
    });
    expect(t?.match).toBe(note);
  });

  it('gives a stored route its visible-set routeId', () => {
    const t = featureTarget('route.route-1', at, sources());
    expect(t?.target).toEqual({
      kind: 'route',
      position: at,
      id: 'route-1',
      href: '/resources/routes/route-1',
      routeId: 'r-9',
      name: 'Home'
    });
  });

  it('gives a never-saved draft only its routeId, matched by name', () => {
    const t = featureTarget(
      'route.r-1',
      at,
      sources({ draftRoute: () => draft(false) })
    );
    expect(t?.target).toEqual({ kind: 'route', position: at, routeId: 'r-1' });
    expect(t?.match).toEqual({ name: '' });
    expect(t?.label).toBe('Route (unsaved)');
  });

  it('gives a saved route with pending edits both its id and its routeId', () => {
    const t = featureTarget(
      'route.r-1',
      at,
      sources({ draftRoute: () => draft(true) })
    );
    expect(t?.target).toMatchObject({
      id: 'route-1',
      href: '/resources/routes/route-1',
      routeId: 'r-1'
    });
  });

  it('points a track href at the store it was read from', () => {
    expect(featureTarget('track.t1', at, sources())?.target).toMatchObject({
      kind: 'track',
      href: '/resources/tracks/t1'
    });
    expect(
      featureTarget('track.tracks:imported:abc', at, sources())?.target
    ).toMatchObject({
      kind: 'track',
      id: 'tracks:imported:abc',
      href: '/tracks/tracks%3Aimported%3Aabc'
    });
    expect(featureTarget('track.t1', at, sources())?.match).toEqual({
      name: 'Old passage',
      description: ''
    });
  });

  it('makes the own vessel and an AIS vessel vessel targets', () => {
    // the own vessel's feature id is the server's self context
    expect(
      featureTarget('vessels.urn:mrn:imo:mmsi:338123456', at, sources())?.target
    ).toEqual({
      kind: 'vessel',
      position: at,
      context: 'vessels.urn:mrn:imo:mmsi:338123456',
      self: true,
      name: 'eSea Street',
      featurePosition: [-80.1, 25.7]
    });
    expect(
      featureTarget('ais-vessels.urn:mrn:imo:mmsi:367123450', at, sources())
        ?.target
    ).toEqual({
      kind: 'vessel',
      position: at,
      context: 'vessels.urn:mrn:imo:mmsi:367123450',
      self: false,
      name: 'Tanker',
      featurePosition: [-80, 25.6]
    });
  });

  it('makes an aid to navigation an aton target, by context', () => {
    expect(
      featureTarget('atons.urn:mrn:imo:mmsi:993672001', at, sources())?.target
    ).toEqual({
      kind: 'aton',
      position: at,
      context: 'atons.urn:mrn:imo:mmsi:993672001',
      name: 'Fowey Rocks',
      featurePosition: [-80.1, 25.59]
    });
  });

  it('has no target for features actions do not apply to', () => {
    for (const id of [
      'waypoint.gone',
      'dest.x',
      'rtept.2',
      'trail.self.local',
      'meteo.urn:x',
      'list.',
      'anchor'
    ]) {
      expect(featureTarget(id, at, sources())).toBeNull();
    }
  });

  it('never lets a world-copy longitude into the target', () => {
    const t = featureTarget('waypoint.w1', [279.89, 25.76], sources());
    expect(t?.target.position[0]).toBeCloseTo(-80.11);
  });
});

describe('chartFeatureTarget', () => {
  const props = {
    layer: 'LNDMRK',
    RCID: 12,
    LNAM: '0226F1A2',
    OBJNAM: 'Communications Tower Mt Talau',
    CATLMK: '17'
  };

  it('takes the class from the layer and the name from OBJNAM', () => {
    const feature = new Feature(new Point(fromLonLat([-173.9826, -18.6473])));
    const t = chartFeatureTarget(props, [-173.9792, -18.6473], feature);
    expect(t.target).toMatchObject({
      kind: 'chartFeature',
      position: [-173.9792, -18.6473],
      name: 'Communications Tower Mt Talau',
      class: 'LNDMRK',
      properties: {
        RCID: 12,
        LNAM: '0226F1A2',
        OBJNAM: 'Communications Tower Mt Talau',
        CATLMK: '17'
      }
    });
    const [lon, lat] = t.target.featurePosition!;
    expect(lon).toBeCloseTo(-173.9826);
    expect(lat).toBeCloseTo(-18.6473);
    // match conditions see the target itself
    expect(t.match).toBe(t.target);
  });

  it('names an unnamed feature by its class in the menu', () => {
    const t = chartFeatureTarget({ layer: 'BOYLAT', RCID: 1 }, [0, 0]);
    expect(t.target.name).toBeUndefined();
    expect(t.target.featurePosition).toBeUndefined();
    expect(t.label).toBeTruthy();
  });
});

describe('overlayFeatureTarget', () => {
  const buoys: TargetOverlay = {
    extension: 'signalk-buoys',
    id: 'buoys',
    title: 'Weather buoys',
    titleProperty: 'station'
  };
  const hit = (
    featureId: string | number,
    properties: Record<string, unknown>,
    feature: FeatureLike = new Feature(new Point(fromLonLat([-80.09, 25.59])))
  ): OverlayHit => ({
    overlayKey: 'signalk-buoys/buoys',
    source: 'stations',
    featureId,
    properties,
    feature,
    above: 0
  });

  it('makes the owning extension’s target, named by titleProperty', () => {
    const t = overlayFeatureTarget(
      hit(17, { station: 'Fowey Rocks', kind: 'buoy' }),
      buoys,
      [-80.1, 25.6]
    );
    expect(t.target).toMatchObject({
      kind: 'overlayFeature',
      position: [-80.1, 25.6],
      overlayId: 'buoys',
      source: 'stations',
      featureId: 17,
      properties: { station: 'Fowey Rocks', kind: 'buoy' },
      name: 'Fowey Rocks'
    });
    const [lon, lat] = t.target.featurePosition!;
    expect(lon).toBeCloseTo(-80.09);
    expect(lat).toBeCloseTo(25.59);
    expect(t.owner).toBe('signalk-buoys');
    expect(t.label).toBe('Fowey Rocks');
    // match conditions see the feature as { id, properties }
    expect(t.match).toEqual({
      id: 17,
      properties: { station: 'Fowey Rocks', kind: 'buoy' }
    });
  });

  it('keeps the id’s type: a string stays a string, a number a number', () => {
    expect(overlayFeatureTarget(hit('17', {}), buoys, at).target).toMatchObject(
      { featureId: '17' }
    );
    expect(overlayFeatureTarget(hit(17, {}), buoys, at).target).toMatchObject({
      featureId: 17
    });
  });

  it('heads an unnamed feature with the overlay’s title', () => {
    const t = overlayFeatureTarget(hit('b1', { name: 'x' }), buoys, at);
    expect(t.target.name).toBeUndefined();
    expect(t.label).toBe('Weather buoys');
  });

  it('gives a line no featurePosition', () => {
    const line = new Feature(
      new LineString([fromLonLat([-80, 25]), fromLonLat([-80.1, 25.1])])
    );
    const t = overlayFeatureTarget(hit('l1', {}, line), buoys, at);
    expect(t.target.featurePosition).toBeUndefined();
  });
});
