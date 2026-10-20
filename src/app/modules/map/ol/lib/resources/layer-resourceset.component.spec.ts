import { describe, it, expect } from 'vitest';
import { Feature } from 'ol';
import { Circle, Style } from 'ol/style';
import { ResourceSetLayerComponent } from './layer-resourceset.component';
import { SKResourceSet } from 'src/app/modules/skresources';

// parseResources reads only plain fields, so exercise it on a bare prototype
// instance (same approach as ais-base.component.spec).
describe('ResourceSetLayerComponent style refs', () => {
  function pointRadius(styleRef: string): number | undefined {
    const c = Object.create(
      ResourceSetLayerComponent.prototype
    ) as ResourceSetLayerComponent;
    Object.assign(c, {
      collection: 'test',
      features: [],
      setTextLabel: (s: Style) => s
    });
    c.parseResources({
      id: 'set1',
      styles: { default: { stroke: 'red', fill: 'red', width: 9 } },
      values: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-80.5, 25.0] },
            properties: { name: 'p', styleRef: styleRef }
          }
        ]
      }
    } as unknown as SKResourceSet);
    const f = (c as unknown as { features: Feature[] }).features[0];
    return ((f.getStyle() as Style).getImage() as Circle).getRadius();
  }

  it('falls back to the set default for a style ref the set lacks', () => {
    expect(pointRadius('missing')).toBe(9);
  });
});
