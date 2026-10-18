import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import type { FeatureLike } from 'ol/Feature';

import { FBMapComponent } from './fb-map.component';
import { RouteBufferRegistry } from '../plotterext/route-buffer.registry';
import { Position } from 'src/app/types';

// A tap on a resource that is no longer in the cache (deleted on the server
// while its feature was still drawn) opens no popover. Exercised on a bare
// prototype instance, as in fb-map.track-route.spec.ts.

const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.overlay = signal({ show: false });
  cmp.mapInteract = { draw: { features: null } };
  cmp.clickWorldOffset = 0;
  cmp.routeBuffers = new RouteBufferRegistry();
  cmp.skres = { fromCache: (): undefined => undefined };
  cmp.infoPanel = { opened: () => false };
  return cmp;
};

const at: Position = [177.4, -17.7];

describe('FBMapComponent — popover for a resource no longer cached', () => {
  for (const type of ['region', 'route', 'waypoint']) {
    it(`opens nothing for a missing ${type}`, () => {
      const cmp = bareComponent();
      expect(cmp.formatPopover(`${type}.gone`, at)).toBe(false);
      expect(cmp.overlay().show).toBe(false);
    });
  }
});

describe('FBMapComponent — tap on a resource no longer cached', () => {
  const tapOn = (id: string) => ({
    features: [
      {
        getId: () => id,
        get: (): undefined => undefined,
        getGeometry: (): undefined => undefined
      }
    ] as unknown as FeatureLike[],
    lonlat: at,
    worldOffset: 0
  });

  for (const type of ['note', 'route', 'waypoint']) {
    it(`lists no stale ${type} under the tap`, () => {
      const cmp = bareComponent();
      Object.defineProperty(cmp, 'activeRoute', { value: undefined });
      cmp.formatPopover = vi.fn();
      expect(() => cmp.processMapClick(tapOn(`${type}.gone`))).not.toThrow();
      expect(cmp.formatPopover).not.toHaveBeenCalled();
    });
  }
});
