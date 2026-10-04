import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';

import { SKResourceService } from './resources.service';
import { FBRoutes, Position } from 'src/app/types';

/**
 * updateRouteCoords() writes a route's points (reordered, reversed, edited) to
 * the server. It changes the cached route first, so when the write fails the
 * cached route goes back to what the server still has, rather than showing
 * points that were never saved. Exercised on a bare prototype instance with
 * the server call stubbed, as in resources-route-hide.spec.ts.
 */
describe('SKResourceService.updateRouteCoords', () => {
  const coords: Position[] = [
    [24.95, 60.15],
    [24.955, 60.16],
    [24.95, 60.17]
  ];
  const reversed = [...coords].reverse();

  const service = (put: () => Promise<unknown>, withMeta = true) => {
    const route = {
      name: 'Harbour run',
      distance: 2000,
      feature: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [...coords] },
        properties: withMeta
          ? {
              coordinatesMeta: [
                { name: 'One' },
                { name: 'Two' },
                { name: 'Three' }
              ]
            }
          : {}
      }
    };
    const svc = Object.create(SKResourceService.prototype) as SKResourceService;
    const parseHttpErrorResponse = vi.fn();
    Object.assign(svc as unknown as Record<string, unknown>, {
      app: { parseHttpErrorResponse, debug: vi.fn() },
      routeCacheSignal: signal([['rte-1', route, true]] as unknown as FBRoutes),
      putToServer: vi.fn(put),
      routeCoordWrites: new Map()
    });
    return { svc, route, parseHttpErrorResponse };
  };

  it('keeps the new points when the server takes them', async () => {
    const { svc, route } = service(async () => ({}));

    expect(await svc.updateRouteCoords('rte-1', reversed)).toBe(true);

    expect(route.feature.geometry.coordinates).toEqual(reversed);
  });

  it('puts the points, their names and the distance back when the write fails', async () => {
    const { svc, route, parseHttpErrorResponse } = service(() =>
      Promise.reject(new Error('403'))
    );

    const ok = await svc.updateRouteCoords('rte-1', reversed, [
      { name: 'Three' },
      { name: 'Two' },
      { name: 'One' }
    ]);

    expect(ok).toBe(false);
    expect(route.feature.geometry.coordinates).toEqual(coords);
    expect(route.feature.properties.coordinatesMeta).toEqual([
      { name: 'One' },
      { name: 'Two' },
      { name: 'Three' }
    ]);
    expect(route.distance).toBe(2000);
    expect(parseHttpErrorResponse).toHaveBeenCalledOnce();
  });

  it("writes a route's points one after another, the next from what the last left", async () => {
    let fail: (err: Error) => void;
    const puts = [
      () => new Promise((_resolve, reject) => (fail = reject)),
      async () => ({})
    ];
    const { svc, route } = service(() => puts.shift()());
    const put = (svc as unknown as { putToServer: ReturnType<typeof vi.fn> })
      .putToServer;
    const later: Position[] = [
      [24.96, 60.15],
      [24.96, 60.17]
    ];
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    const first = svc.updateRouteCoords('rte-1', reversed, [
      { name: 'Three' },
      { name: 'Two' },
      { name: 'One' }
    ]);
    const second = svc.updateRouteCoords('rte-1', later, [
      { name: 'Start' },
      { name: 'End' }
    ]);
    await settle();
    expect(put).toHaveBeenCalledOnce();

    fail(new Error('403'));
    expect(await first).toBe(false);
    expect(await second).toBe(true);

    expect(put).toHaveBeenCalledTimes(2);
    expect(route.feature.geometry.coordinates).toEqual(later);
    expect(route.feature.properties.coordinatesMeta).toEqual([
      { name: 'Start' },
      { name: 'End' }
    ]);
  });

  it('writes the points as they were when the write was asked for', async () => {
    let finish: () => void;
    const puts = [
      () => new Promise<void>((resolve) => (finish = resolve)),
      async () => ({})
    ];
    const { svc, route } = service(() => puts.shift()());
    const later: Position[] = [
      [24.96, 60.15],
      [24.96, 60.17]
    ];
    const names = [{ name: 'Start' }, { name: 'End' }];

    const first = svc.updateRouteCoords('rte-1', reversed);
    const second = svc.updateRouteCoords('rte-1', later, names);
    await new Promise((resolve) => setTimeout(resolve));
    // the caller goes on to change its own arrays while the write waits
    later[0][0] = 0;
    names[0].name = 'Changed';
    finish();
    await first;
    await second;

    expect(route.feature.geometry.coordinates[0]).toEqual([24.96, 60.15]);
    expect(route.feature.properties.coordinatesMeta[0].name).toBe('Start');
  });

  it('leaves a route without point names without them when the write fails', async () => {
    const { svc, route } = service(
      () => Promise.reject(new Error('403')),
      false
    );

    await svc.updateRouteCoords('rte-1', reversed, [
      { name: 'Three' },
      { name: 'Two' },
      { name: 'One' }
    ]);

    expect('coordinatesMeta' in route.feature.properties).toBe(false);
  });
});
