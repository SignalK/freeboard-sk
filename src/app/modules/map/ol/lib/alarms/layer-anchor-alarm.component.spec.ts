import { describe, it, expect } from 'vitest';
import { Feature } from 'ol';
import VectorSource from 'ol/source/Vector';
import { AnchorFeatures, syncSource } from './layer-anchor-alarm.component';
import { WORLD_WIDTH_3857 } from '../../../route-extend';

const ANCHOR = [1000, 2000];
const MOVED = [1500, 2500];
const LINE = [
  [1000, 2000],
  [1100, 2100]
];

describe('AnchorFeatures', () => {
  it('moves the same features on every update instead of building new ones', () => {
    const af = new AnchorFeatures();
    const first = af.place(ANCHOR, 50, LINE, false);
    const second = af.place(MOVED, 60, LINE, false);
    expect(second).toHaveLength(3);
    second.forEach((f, i) => expect(f).toBe(first[i]));
    expect(second[2]).toBe(af.anchor);
    expect(af.anchor.getId()).toBe('anchor');
    expect(af.anchor.getGeometry()?.getCoordinates()).toEqual(MOVED);
    expect(af.circle.getGeometry()?.getCenter()).toEqual(MOVED);
    expect(af.circle.getGeometry()?.getRadius()).toBe(60);
  });

  it('leaves the anchor point where it is while held, and moves the rest', () => {
    const af = new AnchorFeatures();
    af.place(ANCHOR, 50, LINE, false);
    af.anchor.getGeometry()?.setCoordinates([1234, 5678]);
    af.place(MOVED, 50, LINE, true);
    expect(af.anchor.getGeometry()?.getCoordinates()).toEqual([1234, 5678]);
    expect(af.circle.getGeometry()?.getCenter()).toEqual(MOVED);
  });

  it('puts the anchor point back on the anchor position once released', () => {
    const af = new AnchorFeatures();
    af.place(ANCHOR, 50, LINE, false);
    af.anchor.getGeometry()?.setCoordinates([1234, 5678]);
    af.place(ANCHOR, 50, LINE, true);
    af.place(ANCHOR, 50, LINE, false);
    expect(af.anchor.getGeometry()?.getCoordinates()).toEqual(ANCHOR);
  });

  it('keeps the anchor point in the world copy a Modify session moved it to', () => {
    const af = new AnchorFeatures();
    af.place(ANCHOR, 50, LINE, false);
    af.anchor.getGeometry()?.translate(WORLD_WIDTH_3857, 0);
    af.place(MOVED, 50, LINE, false);
    expect(af.anchor.getGeometry()?.getCoordinates()).toEqual([
      MOVED[0] + WORLD_WIDTH_3857,
      MOVED[1]
    ]);
  });

  it('leaves the anchor point untouched when its position has not changed', () => {
    const af = new AnchorFeatures();
    af.place(ANCHOR, 50, LINE, false);
    const revision = af.anchor.getGeometry()?.getRevision();
    af.place([...ANCHOR], 55, LINE, false);
    expect(af.anchor.getGeometry()?.getRevision()).toBe(revision);
  });

  it('draws no line to the vessel when its position is not known', () => {
    const af = new AnchorFeatures();
    expect(af.place(ANCHOR, 50, null, false)).toEqual([af.circle, af.anchor]);
  });
});

describe('syncSource', () => {
  it('keeps the features the source has, adds new ones and drops the rest', () => {
    const kept = new Feature();
    const dropped = new Feature();
    const added = new Feature();
    const source = new VectorSource({ features: [kept, dropped] });
    syncSource(source, [kept, added]);
    const now = source.getFeatures();
    expect(now).toHaveLength(2);
    expect(now).toContain(kept);
    expect(now).toContain(added);
  });
});
