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

// AIS type 30 is fishing, but it shares the 30s with sailing (36) and
// pleasure craft (37), so bucketing alone drew all three alike (#1236).
describe('AISVesselsLayerComponent.buildVesselStyle icon (#1236)', () => {
  function iconRequestFor(typeId: number, state?: string) {
    const requests: Array<[number | string, boolean | undefined]> = [];
    const c = Object.create(
      AISVesselsLayerComponent.prototype
    ) as AISVesselsLayerComponent;
    Object.assign(c, {
      mapImages: {
        getVessel: (id: number | string, moored?: boolean) => {
          requests.push([id, moored]);
          return new Icon({ src: 'vessel.svg' });
        }
      }
    });
    c.buildVesselStyle({
      id: 'urn:mrn:imo:mmsi:123456789',
      type: { id: typeId },
      state
    } as unknown as SKVessel);
    return requests[0];
  }

  it('asks for the fishing icon for a fishing vessel', () => {
    expect(iconRequestFor(30)).toEqual(['fishing', false]);
    expect(iconRequestFor(30, 'moored')).toEqual(['fishing', true]);
  });

  it('keeps sailing and pleasure craft on the type 30 icon', () => {
    expect(iconRequestFor(36)[0]).toBe(30);
    expect(iconRequestFor(37)[0]).toBe(30);
  });
});
