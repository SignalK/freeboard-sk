import { describe, expect, it } from 'vitest';
import Feature, { type FeatureLike } from 'ol/Feature';
import type OlMap from 'ol/Map';
import { Point } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import RenderFeature from 'ol/render/Feature';

import {
  DATA_OVERLAY_LAYER,
  type DataOverlayLayerTag,
  hitsAtPixel,
  overlayFeatureId,
  overlayFeatureProperties
} from './overlay-hits';

const overlayLayer = (tag: Partial<DataOverlayLayerTag> = {}) =>
  new VectorLayer({
    properties: {
      [DATA_OVERLAY_LAYER]: {
        overlayKey: 'probe/buoys',
        source: 'stations',
        interactive: true,
        ...tag
      }
    }
  });

const feature = (id: string | number | undefined, props = {}) => {
  const f = new Feature({ geometry: new Point([0, 0]), ...props });
  if (id !== undefined) f.setId(id);
  return f;
};

/**
 * A map that reports these hits, topmost first, as OpenLayers would: a layer
 * the filter turns down is not hit-tested at all.
 */
const mapHitting = (hits: Array<[FeatureLike, VectorLayer]>) =>
  ({
    forEachFeatureAtPixel: (
      _pixel: number[],
      cb: (f: FeatureLike, l: VectorLayer) => void,
      opts: { layerFilter: (l: VectorLayer) => boolean }
    ) => {
      for (const [f, l] of hits) if (opts.layerFilter(l)) cb(f, l);
    }
  }) as unknown as OlMap;

describe('hitsAtPixel', () => {
  it('keeps overlay features out of the map’s own, whatever their ids', () => {
    const host = feature('waypoint.w1');
    const lookalike = feature('waypoint.w1');
    const { features, overlayHits } = hitsAtPixel(
      mapHitting([
        [lookalike, overlayLayer()],
        [host, new VectorLayer()]
      ]),
      [0, 0],
      5
    );
    expect(features).toEqual([host]);
    expect(overlayHits).toHaveLength(1);
    expect(overlayHits[0]).toMatchObject({
      overlayKey: 'probe/buoys',
      source: 'stations',
      featureId: 'waypoint.w1',
      feature: lookalike,
      above: 0
    });
  });

  it('does not hit-test a non-interactive overlay: a click goes beneath', () => {
    const host = feature('waypoint.w1');
    const { features, overlayHits } = hitsAtPixel(
      mapHitting([
        [feature('anchor'), overlayLayer({ interactive: false })],
        [host, new VectorLayer()]
      ]),
      [0, 0],
      5
    );
    expect(features).toEqual([host]);
    expect(overlayHits).toEqual([]);
  });

  it('places each overlay hit among the map’s features, in hit order', () => {
    const route = feature('route.r1');
    const chart = feature(undefined, { layer: 'LNDMRK' });
    const { overlayHits } = hitsAtPixel(
      mapHitting([
        [route, new VectorLayer()],
        [feature('b1'), overlayLayer()],
        [chart, new VectorLayer()]
      ]),
      [0, 0],
      5
    );
    expect(overlayHits[0].above).toBe(1);
  });

  it('hits a feature drawn by several of the overlay’s layers once', () => {
    const f = feature('b1');
    const { overlayHits } = hitsAtPixel(
      mapHitting([
        [f, overlayLayer()],
        [f, overlayLayer()]
      ]),
      [0, 0],
      5
    );
    expect(overlayHits).toHaveLength(1);
  });

  it('skips a feature with no id: it is not selectable', () => {
    const { overlayHits } = hitsAtPixel(
      mapHitting([[feature(undefined), overlayLayer()]]),
      [0, 0],
      5
    );
    expect(overlayHits).toEqual([]);
  });

  it('echoes the feature’s own properties, without its geometry', () => {
    const { overlayHits } = hitsAtPixel(
      mapHitting([[feature(3, { station: 'Fowey Rocks' }), overlayLayer()]]),
      [0, 0],
      5
    );
    expect(overlayHits[0].properties).toEqual({ station: 'Fowey Rocks' });
  });
});

describe('overlayFeatureId', () => {
  it('takes the feature’s own id, keeping its type', () => {
    expect(overlayFeatureId(feature('b17'), undefined)).toBe('b17');
    expect(overlayFeatureId(feature(17), undefined)).toBe(17);
    expect(overlayFeatureId(feature(0), undefined)).toBe(0);
  });

  const tile = (props: Record<string, unknown>, id?: number) =>
    new RenderFeature(
      'Point',
      [0, 0],
      [],
      2,
      { layer: 'stations', ...props },
      id
    );

  it('takes the property promoteId names on a vector tile feature', () => {
    expect(overlayFeatureId(tile({ code: 'FWYF1' }, 9), 'code')).toBe('FWYF1');
    expect(overlayFeatureId(tile({ wmo: 41009 }, 9), 'wmo')).toBe(41009);
    // promoteId names a property the feature lacks: no id, not selectable
    expect(overlayFeatureId(tile({}, 9), 'code')).toBeUndefined();
  });

  it('keeps a GeoJSON feature’s top-level id, whatever promoteId says', () => {
    expect(overlayFeatureId(feature('b17', { code: 'FWYF1' }), 'code')).toBe(
      'b17'
    );
  });

  it('takes a per-source-layer promoteId from a vector tile feature', () => {
    const tileFeature = new RenderFeature(
      'Point',
      [0, 0],
      [],
      2,
      { layer: 'stations', code: 'FWYF1' },
      9
    );
    expect(overlayFeatureId(tileFeature, { stations: 'code' })).toBe('FWYF1');
    // a source layer it does not list keeps the feature's own id
    expect(overlayFeatureId(tileFeature, { buoys: 'code' })).toBe(9);
  });

  it('has no id for an empty string or a non-finite number', () => {
    expect(overlayFeatureId(tile({ code: '' }), 'code')).toBeUndefined();
    expect(overlayFeatureId(tile({ n: NaN }), 'n')).toBeUndefined();
    expect(overlayFeatureId(feature(''), undefined)).toBeUndefined();
  });
});

describe('overlayFeatureProperties', () => {
  it('leaves out the tile reader’s layer key on a vector tile feature', () => {
    const tileFeature = new RenderFeature(
      'Point',
      [0, 0],
      [],
      2,
      { layer: 'stations', code: 'FWYF1' },
      9
    );
    expect(overlayFeatureProperties(tileFeature)).toEqual({ code: 'FWYF1' });
  });
});
