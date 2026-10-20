import { describe, it, expect } from 'vitest';
import { Icon, Style } from 'ol/style';
import { AISVesselsLayerComponent } from './layer-aisvessels.component';
import { SKVessel } from 'src/app/modules/skresources';

// buildVesselStyle reads only plain fields, so exercise it on a bare
// prototype instance (same approach as ais-base.component.spec).
describe('AISVesselsLayerComponent.buildVesselStyle', () => {
  const icon = new Icon({ src: 'vessel.svg' });

  function styled(targetStyles: Record<string, unknown>) {
    const c = Object.create(
      AISVesselsLayerComponent.prototype
    ) as AISVesselsLayerComponent;
    Object.assign(c, {
      targetStyles,
      mapImages: { getVessel: () => icon }
    });
    return c.buildVesselStyle({
      id: 'urn:mrn:imo:mmsi:123456789',
      type: { id: 36 },
      state: 'moored'
    } as unknown as SKVessel);
  }

  it("uses the ship type's style for the vessel's state", () => {
    const moored = new Style();
    expect(styled({ 30: { moored, default: new Style() } })).toBe(moored);
  });

  it('uses a ship type entry that is a single style', () => {
    const style = new Style();
    expect(styled({ 30: style })).toBe(style);
  });

  it('falls back to the vessel icon when no style is configured for it', () => {
    expect(styled({}).getImage()).toBe(icon);
  });
});
