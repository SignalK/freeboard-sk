import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { SKResourceService } from './resources.service';
import { SKRoute } from './resource-classes';

/**
 * `saveNewRoute()` resolves the new route's id, or null when the user closes
 * the dialog. A route the server stores without returning an id must not
 * resolve null, or the caller reports a cancel for a route that was written.
 * Exercised on a bare prototype instance with the dialog and server stubbed.
 */
function svcSaving(serverId: string | undefined) {
  const svc = Object.create(SKResourceService.prototype) as SKResourceService;
  const selectionAdd = vi.fn();
  Object.assign(svc as unknown as Record<string, unknown>, {
    app: { parseHttpErrorResponse: vi.fn() },
    dialog: {
      open: () => ({
        afterClosed: () => of({ save: true, route: new SKRoute() })
      })
    },
    postToServer: vi.fn().mockResolvedValue({ id: serverId }),
    selectionAdd
  });
  return { svc, selectionAdd };
}

describe('saveNewRoute()', () => {
  it('resolves the id the server returns and selects the route', async () => {
    const { svc, selectionAdd } = svcSaving('route-1');
    await expect(svc.saveNewRoute(new SKRoute())).resolves.toBe('route-1');
    expect(selectionAdd).toHaveBeenCalledWith('routes', 'route-1');
  });

  it('rejects when the server returns no id', async () => {
    const { svc, selectionAdd } = svcSaving(undefined);
    await expect(svc.saveNewRoute(new SKRoute())).rejects.toThrow(
      'Route response did not include an id'
    );
    expect(selectionAdd).not.toHaveBeenCalled();
  });
});
