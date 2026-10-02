import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';

import { FBMapComponent } from './fb-map.component';
import { RouteBufferRegistry } from '../plotterext/route-buffer.registry';
import { Position } from 'src/app/types';

// REVERSE in a draft route's popover turns the draft round, so START follows
// it the other way. Exercised on a bare prototype instance, as in
// fb-map.pointer-down.spec.ts.

const coords: Position[] = [
  [24.95, 60.15],
  [24.955, 60.16],
  [24.95, 60.17]
];

const bareComponent = (registry: RouteBufferRegistry, id: string) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.routeBuffers = registry;
  cmp.overlay = signal({ id, type: 'route', show: true });
  return cmp;
};

describe('FBMapComponent.reverseDraftRoute', () => {
  it('turns the draft round, point names and all', () => {
    const registry = new RouteBufferRegistry();
    const { routeId } = registry.create({
      points: coords.map((position, i) => ({ position, name: `P${i}` }))
    });

    bareComponent(registry, routeId).reverseDraftRoute();

    const points = registry.get(routeId).points;
    expect(points.map((p) => p.position)).toEqual([...coords].reverse());
    expect(points.map((p) => p.name)).toEqual(['P2', 'P1', 'P0']);
  });

  it('leaves a saved route as it is', () => {
    const registry = new RouteBufferRegistry();
    const { routeId } = registry.create({
      points: coords.map((position) => ({ position }))
    });
    registry.markSaved(routeId, '/resources/routes/rte-1');

    bareComponent(registry, routeId).reverseDraftRoute();

    expect(registry.get(routeId).points.map((p) => p.position)).toEqual(coords);
  });
});
