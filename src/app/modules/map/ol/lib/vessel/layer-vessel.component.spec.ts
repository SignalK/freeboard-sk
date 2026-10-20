import { describe, it, expect } from 'vitest';
import Style from 'ol/style/Style';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import {
  VesselComponent,
  STALE_VESSEL_OPACITY
} from './layer-vessel.component';

/**
 * When self position stops updating, the own-vessel icon must say so on the
 * chart rather than relying on the transient status message that prompted
 * #672. `parseVessel()` reads only plain fields, so exercise it on a bare
 * prototype instance (same approach as layer-aistargets.component.spec).
 */
function vessel(stale: boolean) {
  const c = Object.create(VesselComponent.prototype) as VesselComponent;
  Object.assign(c, {
    position: [1, 2],
    heading: 0,
    stale,
    mapImages: { getExternalSymbol: (): null => null }
  });
  return c;
}

/** Styles set on the feature, normalised to an array. */
function styles(c: VesselComponent): Style[] {
  const s = c.vessel?.getStyle();
  return (Array.isArray(s) ? s : [s]) as Style[];
}

describe('VesselComponent stale position indication (#672)', () => {
  it('marks a stale vessel with a "?" badge and dims the icon', () => {
    const c = vessel(true);
    c.parseVessel();

    const s = styles(c);
    expect(s.length).toBe(2);
    expect(s[1].getText()?.getText()).toBe('?');
    expect(s[0].getImage()?.getOpacity()).toBe(STALE_VESSEL_OPACITY);
  });

  it('shows no badge and a fully opaque icon when position is current', () => {
    const c = vessel(false);
    c.parseVessel();

    const s = styles(c);
    expect(s.length).toBe(1);
    expect(s[0].getImage()?.getOpacity()).toBe(1);
  });

  it('restores the icon when position resumes', () => {
    const c = vessel(true);
    c.parseVessel();
    c.stale = false;
    c.parseVessel();

    const s = styles(c);
    expect(s.length).toBe(1);
    expect(s[0].getImage()?.getOpacity()).toBe(1);
  });
});

describe('VesselComponent without a position', () => {
  function withSource(position: [number, number] | undefined) {
    const c = vessel(false);
    c.position = position;
    c.source = new VectorSource();
    return c;
  }

  it('draws no vessel until a position arrives, then draws it there', () => {
    const c = withSource(undefined);
    c.parseVessel();
    expect(c.source?.getFeatures()).toEqual([]);

    c.position = [1, 2];
    c.parseVessel();
    const features = c.source?.getFeatures() ?? [];
    expect(features.length).toBe(1);
    const at = toLonLat((features[0].getGeometry() as Point).getCoordinates());
    expect(at[0]).toBeCloseTo(1);
    expect(at[1]).toBeCloseTo(2);
  });

  it('removes the vessel when its position is cleared', () => {
    const c = withSource([1, 2]);
    c.parseVessel();
    expect(c.source?.getFeatures().length).toBe(1);

    c.position = undefined;
    c.parseVessel();
    expect(c.source?.getFeatures()).toEqual([]);
    expect(c.vessel).toBeUndefined();
  });
});
