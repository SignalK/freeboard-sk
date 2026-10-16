import { describe, expect, it } from 'vitest';
import { SimpleChange } from '@angular/core';
import VectorLayer from 'ol/layer/Vector';
import { FBFeatureLayerComponent } from './sk-feature.component';

/**
 * Layer properties given as an input can change after the layer is made, for
 * example a layer shown from a zoom setting that the user changes, and must
 * reach the layer at once.
 */
describe('FBFeatureLayerComponent: layer properties', () => {
  const component = () => {
    const c = Object.create(
      FBFeatureLayerComponent.prototype
    ) as FBFeatureLayerComponent;
    Object.assign(c, { layer: new VectorLayer({ minZoom: 11.9 }) });
    return c;
  };

  it('applies changed layer properties to the layer', () => {
    const c = component();

    c.ngOnChanges({
      layerProperties: new SimpleChange(
        { minZoom: 11.9 },
        { minZoom: 7.9 },
        false
      )
    });

    expect(c['layer'].getMinZoom()).toBe(7.9);
  });

  it('applies them alongside the other inputs that changed', () => {
    const c = component();

    c.ngOnChanges({
      zIndex: new SimpleChange(1, 450, false),
      layerProperties: new SimpleChange(
        { minZoom: 11.9 },
        { minZoom: 7.9 },
        false
      )
    });

    expect(c['layer'].getZIndex()).toBe(450);
    expect(c['layer'].getMinZoom()).toBe(7.9);
  });
});
