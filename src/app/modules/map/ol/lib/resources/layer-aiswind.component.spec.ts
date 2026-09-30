import { describe, it, expect } from 'vitest';
import { getGreatCircleBearing } from 'geolib';
import { toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { AISWindLayerComponent } from './layer-aiswind.component';
import { SKVessel } from 'src/app/modules/skresources';
import { Convert } from 'src/app/lib/convert';
import { Angle } from 'src/app/lib/geoutils';

const rad = Convert.degreesToRadians;

/**
 * The AIS true-wind vector is drawn on a chart laid out to true north, so it
 * must use the TRUE wind direction whatever the user's true/magnetic display
 * choice (#857). With magnetic selected, `wind.direction` carries the magnetic
 * value, which rotated the vector by the local variation.
 *
 * `calcVector` only reads plain fields, so exercise it on a bare prototype
 * instance (same approach as ais-base.component.spec).
 */
function layer(vectorApparent = false) {
  const c = Object.create(
    AISWindLayerComponent.prototype
  ) as AISWindLayerComponent;
  Object.assign(c, { vectorApparent, mapZoom: 12 });
  return c;
}

// Sydney Harbour (variation ~12.8E)
const position: [number, number] = [151.225, -33.855];
const variation = 12.8;

function target(
  twd: number | null,
  mwd: number | null,
  magneticVariation: number | null = null
): SKVessel {
  return {
    position,
    orientation: 0,
    magneticVariation,
    // with useMagnetic on, wind.direction carries the magnetic value
    wind: { twd, mwd, direction: mwd }
  } as unknown as SKVessel;
}

/** bearing (degrees) of the drawn vector */
function vectorBearing(v: number[][]) {
  const [from, to] = v.map((c) => toLonLat(c) as [number, number]);
  return getGreatCircleBearing(from, to);
}

describe('AISWindLayerComponent.calcVector (#857)', () => {
  it('draws the true-wind vector from true wind direction when the display is magnetic', () => {
    const v = layer().calcVector(target(rad(30), rad(30 - variation)));
    expect(v).toHaveLength(2);
    expect(Math.abs(Angle.difference(vectorBearing(v), 30))).toBeLessThan(0.1);
  });

  it('derives the true-wind vector from magnetic wind and variation (#858)', () => {
    const v = layer().calcVector(
      target(null, rad(30 - variation), rad(variation))
    );
    expect(v).toHaveLength(2);
    expect(Math.abs(Angle.difference(vectorBearing(v), 30))).toBeLessThan(0.1);
  });

  it('draws no true-wind vector without a true wind direction', () => {
    expect(layer().calcVector(target(null, rad(17)))).toEqual([]);
  });
});

describe('AISWindLayerComponent.onUpdateTargets', () => {
  it('removes a drawn vector once the target has no direction for it', () => {
    const id = 'vessels.urn:mrn:imo:mmsi:503999001';
    const c = layer(true);
    const t = target(null, rad(17));
    (t as unknown as { wind: { awa: number } }).wind.awa = rad(60);
    const source = new VectorSource();
    Object.assign(c, {
      targetContext: 'vessels',
      targets: new Map([[id, t]]),
      source
    });
    const f = new Feature(new LineString(c.calcVector(t)));
    f.setId('wind-' + id);
    source.addFeature(f);

    // switch to true-wind vectors: this target reports no true wind
    c.vectorApparent = false;
    c.onUpdateTargets([id]);

    expect(source.getFeatureById('wind-' + id)).toBeNull();
  });
});
