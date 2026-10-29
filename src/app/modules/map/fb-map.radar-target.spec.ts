import { describe, expect, it, vi } from 'vitest';

import { FBMapComponent } from './fb-map.component';

// A bare prototype instance, as in fb-map.split-tap.spec.ts: the radar target
// actions read only the vessel position, the radar service and the alerts.
const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    data: { vessels: { self: { position: [178.4, -18.1] } } },
    showMessage: vi.fn(),
    showAlert: vi.fn()
  };
  cmp.radarApi = {
    radarId: () => 'fur6424A',
    acquireTarget: vi.fn(() => Promise.resolve(4)),
    cancelTarget: vi.fn(() => Promise.resolve())
  };
  return cmp;
};

describe('FBMapComponent: radar targets', () => {
  it('acquires at the chosen point, by bearing and distance from own ship', async () => {
    const cmp = bareComponent();
    // one nautical mile due north
    await cmp.acquireRadarTarget([178.4, -18.1 + 1 / 60]);

    expect(cmp.radarApi.acquireTarget).toHaveBeenCalledWith(
      'fur6424A',
      expect.objectContaining({ bearing: expect.closeTo(0, 3) })
    );
    const { distance } = cmp.radarApi.acquireTarget.mock.calls[0][1];
    expect(distance).toBeGreaterThan(1840);
    expect(distance).toBeLessThan(1860);
    expect(cmp.app.showMessage).toHaveBeenCalled();
  });

  it('acquires nothing while own position is unknown', async () => {
    const cmp = bareComponent();
    cmp.app.data.vessels.self.position = null;
    await cmp.acquireRadarTarget([178.4, -18.0]);
    expect(cmp.radarApi.acquireTarget).not.toHaveBeenCalled();
  });

  it('shows why the radar refused', async () => {
    const cmp = bareComponent();
    cmp.radarApi.acquireTarget = vi.fn(() =>
      Promise.reject(new Error('needs a signed-in user'))
    );
    await cmp.acquireRadarTarget([178.4, -18.0]);
    expect(cmp.app.showAlert).toHaveBeenCalledWith(
      'Radar',
      'needs a signed-in user'
    );
  });

  it('stops tracking on the radar and target the context names', async () => {
    const cmp = bareComponent();
    await cmp.cancelRadarTarget('targets.radar:fur6424A-12');
    expect(cmp.radarApi.cancelTarget).toHaveBeenCalledWith('fur6424A', 12);
  });
});
