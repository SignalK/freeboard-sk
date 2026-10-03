import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';

import { FBMapComponent } from './fb-map.component';
import { RouteReverseMode } from '../skresources/route-reverse.service';

// REVERSE in a route's popover hands the route to RouteReverseService, which
// decides how it is turned round (see route-reverse.service.spec.ts).
// Exercised on a bare prototype instance, as in fb-map.pointer-down.spec.ts.

const bareComponent = (type: string, mode: RouteReverseMode | null) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.overlay = signal({ id: 'rte-1', type, show: true });
  cmp.routeReverse = {
    mode: vi.fn(() => mode),
    reverse: vi.fn(async () => true)
  };
  return cmp;
};

describe('FBMapComponent route REVERSE', () => {
  it('offers REVERSE for a route the service can turn round', () => {
    expect(bareComponent('route', 'stored').canReverseRoute()).toBe(true);
  });

  it('does not offer it when the service cannot, or for another resource', () => {
    expect(bareComponent('route', null).canReverseRoute()).toBe(false);
    expect(bareComponent('waypoint', 'stored').canReverseRoute()).toBe(false);
  });

  it("turns the popover's route round", () => {
    const cmp = bareComponent('route', 'stored');
    cmp.reverseRoute();
    expect(cmp.routeReverse.reverse).toHaveBeenCalledWith('rte-1');
  });
});
