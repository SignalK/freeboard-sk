import { describe, expect, it, vi } from 'vitest';

import { FBMapComponent } from './fb-map.component';

// A bare prototype instance, as in fb-map.split-tap.spec.ts: the radar target
// actions read only the vessel position, the radar service and the alerts.
const bareComponent = () => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    data: {
      vessels: { self: { position: [178.4, -18.1] } },
      targets: new Map()
    },
    showMessage: vi.fn(),
    showAlert: vi.fn()
  };
  cmp.radarApi = {
    radarId: () => 'fur6424A',
    radar: (): { device: { id: string } } | undefined => ({
      device: { id: 'fur6424A' }
    }),
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
    expect(cmp.app.showMessage).toHaveBeenCalledWith(
      expect.stringMatching(/^Tracking started\./)
    );
  });

  it('offers Track Radar Target only while a radar is reported', () => {
    const cmp = bareComponent();
    // the picture's power state reads as sending while no radar reported
    cmp.radarImage = () => true;
    cmp.app.uiCtrl = () => ({ radarLayer: true });
    cmp.app.data.vessels.showSelf = true;
    expect(cmp.canTrackRadarTarget()).toBe(true);

    cmp.radarApi.radarId = () => '';
    expect(cmp.canTrackRadarTarget()).toBe(false);
  });

  it('acquires on the radar shown, not one selected but not loaded yet', async () => {
    const cmp = bareComponent();
    cmp.radarImage = () => true;
    cmp.app.uiCtrl = () => ({ radarLayer: true });
    cmp.app.data.vessels.showSelf = true;
    cmp.radarApi.radarId = () => 'nav1';
    expect(cmp.canTrackRadarTarget()).toBe(false);
    await cmp.acquireRadarTarget([178.4, -18.0]);
    expect(cmp.radarApi.acquireTarget).not.toHaveBeenCalled();
  });

  it('offers nothing before the radar details load', () => {
    const cmp = bareComponent();
    cmp.radarImage = () => true;
    cmp.app.uiCtrl = () => ({ radarLayer: true });
    cmp.app.data.vessels.showSelf = true;
    cmp.radarApi.radar = () => undefined;
    expect(cmp.canTrackRadarTarget()).toBe(false);
  });

  it('acquires nothing without a radar', async () => {
    const cmp = bareComponent();
    cmp.radarApi.radarId = () => '';
    await cmp.acquireRadarTarget([178.4, -18.0]);
    expect(cmp.radarApi.acquireTarget).not.toHaveBeenCalled();
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

  it('stops every radar target linked to a vessel, and nothing else', async () => {
    const cmp = bareComponent();
    const vessel = 'vessels.urn:mrn:imo:mmsi:244060000';
    cmp.app.data.targets = new Map([
      ['targets.radar:fur6424A-12', { sameAs: vessel }],
      ['targets.radar:nav1-3', { sameAs: 'targets.radar:fur6424A-12' }],
      ['targets.camera:bow-7', { sameAs: vessel }],
      ['targets.radar:fur6424A-13', { sameAs: null }]
    ]);

    await cmp.cancelLinkedRadarTargets(vessel);

    expect(cmp.radarApi.cancelTarget.mock.calls).toEqual([
      ['fur6424A', 12],
      ['nav1', 3]
    ]);
  });
});
