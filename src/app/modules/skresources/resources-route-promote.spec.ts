import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { SKResourceService } from './resources.service';

/**
 * Saving a route in Route Details keeps it: a temporary route (one started
 * straight from a drawing) becomes an ordinary route, so STOP no longer
 * deletes a route the user has deliberately named.
 *
 * `editRouteInfo` only uses the dialog, `fromServer`, `putToServer` and a few
 * app members, so it runs on a bare prototype (same approach as
 * resources-route-hide.spec).
 */
const stored = () => ({
  name: 'Temporary route',
  description: '',
  distance: 0,
  feature: {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: {
      temporary: { created: '2026-09-30T10:00:00.000Z' },
      coordinatesMeta: [{ name: 'Leading light' }]
    }
  }
});

function svc(dialogResult: { save: boolean }) {
  const put = vi.fn((..._args: unknown[]) => Promise.resolve({}));
  const s = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(s as unknown as Record<string, unknown>, {
    app: {
      sIsFetching: { set: () => undefined },
      parseHttpErrorResponse: () => undefined
    },
    fromServer: () => Promise.resolve(stored()),
    putToServer: put,
    dialog: {
      open: (_cmp: unknown, config: { data: { route: unknown } }) => ({
        afterClosed: () =>
          of({
            ...dialogResult,
            route: { ...(config.data.route as object), name: 'Harbour exit' }
          })
      })
    }
  });
  return { s, put };
}

const savedProperties = (put: ReturnType<typeof vi.fn>) =>
  (put.mock.calls[0][2] as { feature: { properties: Record<string, unknown> } })
    .feature.properties;

describe('editRouteInfo on a temporary route', () => {
  it('saves it as an ordinary route, keeping its other properties', async () => {
    const { s, put } = svc({ save: true });

    await s.editRouteInfo('rte-1');

    expect(put).toHaveBeenCalledWith('routes', 'rte-1', expect.anything());
    expect((put.mock.calls[0][2] as { name: string }).name).toBe(
      'Harbour exit'
    );
    expect(savedProperties(put)).toEqual({
      coordinatesMeta: [{ name: 'Leading light' }]
    });
  });

  it('changes nothing when the dialog is cancelled', async () => {
    const { s, put } = svc({ save: false });

    await s.editRouteInfo('rte-1');

    expect(put).not.toHaveBeenCalled();
  });
});
