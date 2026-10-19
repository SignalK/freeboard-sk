import { describe, it, expect, vi } from 'vitest';
import { SimpleChange, type ChangeDetectorRef } from '@angular/core';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import type { MapComponent } from '../map.component';
import type { MapImageRegistry } from '../map-image-registry.service';
import {
  VesselComponent,
  STALE_VESSEL_OPACITY,
  INACTIVE_VESSEL_OPACITY,
  selfVesselIcon
} from './layer-vessel.component';
import type { OwnVesselIconType } from 'src/app/modules/icons/vessels';

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

  describe('actual-size scaling with a custom icon', () => {
    const fakeIcon = () => {
      const icon = {
        size: null as [number, number] | null,
        scale: 1 as number | [number, number],
        change: null as (() => void) | null,
        clone: () => icon,
        setRotateWithView: () => icon,
        getSize: () => icon.size,
        setScale: (scale: number | [number, number]) => {
          icon.scale = scale;
          return icon;
        },
        getScale: () => icon.scale,
        listenImageChange: (cb: () => void) => {
          icon.change = cb;
        },
        unlistenImageChange: (cb: () => void) => {
          if (icon.change === cb) {
            icon.change = null;
          }
        }
      };
      return icon;
    };

    it('recalculates once the icon reports its size', () => {
      const icon = fakeIcon();
      const c = new VesselComponent(
        { detach: (): void => undefined } as unknown as ChangeDetectorRef,
        {
          getMap: () => ({
            getView: () => ({
              getResolution: () => 0.5,
              getProjection: () => 'EPSG:3857'
            })
          })
        } as unknown as MapComponent,
        {
          getExternalSymbol: () => icon as unknown as Icon
        } as unknown as MapImageRegistry
      );
      Object.assign(c, {
        position: [0, 0],
        heading: 0,
        stale: false,
        vessel: {},
        actualSize: true,
        iconScale: 1,
        lengthOverall: 120,
        beam: 10
      });
      vi.spyOn(c, 'parseVessel').mockImplementation(() => undefined);

      c.generateSelfStyle();
      expect(icon.change).toBeTruthy();

      icon.size = [30, 60];
      icon.change?.();

      expect(icon.change).toBeNull();
      expect(icon.scale).toEqual([
        expect.closeTo(20 / 30, 6),
        expect.closeTo(240 / 60, 6)
      ]);
    });
  });

  describe('actual-size scaling follows the vessel latitude', () => {
    const component = () => {
      const c = Object.create(VesselComponent.prototype) as VesselComponent;
      Object.assign(c, {
        layer: { setProperties: (): void => undefined },
        source: {},
        actualSize: true,
        iconScale: 0.9,
        mapImages: { getExternalSymbol: (): null => null }
      });
      vi.spyOn(c, 'generateSelfStyle').mockImplementation(() => undefined);
      vi.spyOn(c, 'parseVessel').mockImplementation(() => undefined);
      return c;
    };

    it('recalculates the scale when the position changes', () => {
      const c = component();
      c.ngOnChanges({
        position: new SimpleChange([0, 0], [10, 50], false)
      });

      expect(c.generateSelfStyle).toHaveBeenCalled();
      expect(c.parseVessel).toHaveBeenCalled();
    });

    it('leaves the style alone for a heading-only change', () => {
      const c = component();
      c.ngOnChanges({
        heading: new SimpleChange(0, 1, false)
      });

      expect(c.generateSelfStyle).not.toHaveBeenCalled();
      expect(c.parseVessel).toHaveBeenCalled();
    });
  });
});

describe('own-vessel icon while another vessel is selected', () => {
  it('keeps the chosen shape and dims it', () => {
    const c = Object.create(VesselComponent.prototype) as VesselComponent;
    Object.assign(c, {
      id: 'self',
      activeId: 'other',
      position: [1, 2],
      heading: 0,
      stale: false,
      iconType: 'catamaran',
      mapImages: { getExternalSymbol: (): null => null }
    });

    c.parseVessel();

    const image = (c.vessel.getStyle() as Style).getImage() as Icon;
    expect(image.getSrc()).toContain('self_catamaran.svg');
    expect(image.getOpacity()).toBe(INACTIVE_VESSEL_OPACITY);
  });
});

describe('selfVesselIcon own-vessel types', () => {
  const noOverrides = {
    getExternalSymbol: (): null => null
  } as unknown as MapImageRegistry;

  it.each<[OwnVesselIconType, string]>([
    ['monohull', 'self_monohull.svg'],
    ['catamaran', 'self_catamaran.svg'],
    ['powerboat', 'self_powerboat.svg']
  ])('draws a %s from its own icon', (type, file) => {
    const icon = selfVesselIcon(noOverrides, 0.9, type);
    expect(icon.getSrc()).toContain(file);
    expect(icon.getScale()).toBe(0.9);
  });

  it('defaults to the sailing monohull', () => {
    expect(selfVesselIcon(noOverrides).getSrc()).toContain('self_monohull.svg');
  });

  it('still prefers a registered external override', () => {
    const override = new Icon({ src: './custom-self.svg' });
    const withOverride = {
      getExternalSymbol: (): Icon => override
    } as unknown as MapImageRegistry;

    const icon = selfVesselIcon(withOverride, 1.2, 'catamaran');
    expect(icon.getSrc()).toContain('custom-self.svg');
    expect(icon.getScale()).toBe(1.2);
  });
});
