import { describe, expect, it, vi } from 'vitest';
import {
  ANIMATED_MIN_INTERVAL_MS,
  BACKOFF_SETTLE_MS,
  LIVE_FRAME_MIN_INTERVAL_MS,
  MAX_ACTIVE_OVERLAYS,
  OverlayRefusal,
  OverlayRegistry,
  type OverlayDefinition
} from './overlay-registry';
import { OverlayContribution, PanelContribution } from './types';

const def = (
  id: string,
  extra: Partial<OverlayContribution> = {}
): OverlayContribution => ({
  id,
  title: id.toUpperCase(),
  type: 'image',
  runtime: 'renderer',
  ...extra
});

const defs = (
  extension: string,
  ...contribs: OverlayContribution[]
): OverlayDefinition[] =>
  contribs.map((d) => ({
    extension,
    extensionName: `${extension} plugin`,
    def: d
  }));

const fakeImage = (width = 100, height = 50) =>
  ({ width, height, close: vi.fn() }) as unknown as ImageBitmap & {
    close: ReturnType<typeof vi.fn>;
  };

const VIEW = {
  extent: [0, 0, 1000, 500] as [number, number, number, number],
  bounds: [0, 0, 0.01, 0.005] as [number, number, number, number],
  width: 100,
  height: 50,
  pixelRatio: 1,
  resolution: 10,
  zoom: 15,
  rotation: 0
};

describe('OverlayRegistry entries', () => {
  it('orders aboveCharts before aboveResources, manifest order within a band', () => {
    const r = new OverlayRegistry();
    r.setDefinitions([
      ...defs('ext-a', def('top', { band: 'aboveResources' }), def('one')),
      ...defs('ext-b', def('two'))
    ]);
    expect(r.entries().map((e) => e.key)).toEqual([
      'ext-a/one',
      'ext-b/two',
      'ext-a/top'
    ]);
    const [one, two, top] = r.entries();
    expect(one.zIndex).toBeLessThan(two.zIndex);
    expect(one.zIndex).toBeGreaterThan(56); // above weather/currents
    expect(two.zIndex).toBeLessThan(99); // below radar
    // never over AIS targets (200+), alarms (300, 350) or vessel lines
    expect(top.zIndex).toBeGreaterThan(120); // above resource sets
    expect(top.zIndex).toBeLessThan(200);
  });

  it('treats an unknown band as aboveCharts', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(defs('ext-a', def('x', { band: 'sideways' as never })));
    expect(r.entries()[0].band).toBe('aboveCharts');
  });

  it('starts from the manifest visible/opacity, then follows the user', () => {
    const persist = vi.fn();
    const r = new OverlayRegistry();
    r.setPersist(persist);
    r.setDefinitions(
      defs('ext-a', def('a', { visible: false, opacity: 0.4 }), def('b'))
    );
    expect(r.entry('ext-a/a')).toMatchObject({ visible: false, opacity: 0.4 });
    expect(r.entry('ext-a/b')).toMatchObject({ visible: true, opacity: 1 });
    r.setVisibility(['ext-a/a'], true);
    r.setOpacity(['ext-a/a'], 2);
    expect(r.entry('ext-a/a')).toMatchObject({ visible: true, opacity: 1 });
    expect(persist).toHaveBeenLastCalledWith({
      'ext-a/a': { visible: true, opacity: 1 }
    });
  });

  it('previews an opacity without persisting it', () => {
    const persist = vi.fn();
    const r = new OverlayRegistry();
    r.setPersist(persist);
    r.setDefinitions(defs('ext-a', def('a')));
    r.setOpacity(['ext-a/a'], 0.3, false);
    expect(r.entry('ext-a/a')!.opacity).toBe(0.3);
    expect(persist).not.toHaveBeenCalled();
  });

  it('ignores malformed saved choices', () => {
    const r = new OverlayRegistry();
    r.loadSettings({
      'ext-a/a': { visible: 'yes' as never, opacity: 7 }
    });
    r.setDefinitions(defs('ext-a', def('a', { visible: false, opacity: 0.5 })));
    expect(r.entry('ext-a/a')).toMatchObject({ visible: false, opacity: 1 });
  });

  it('restores saved choices', () => {
    const r = new OverlayRegistry();
    r.loadSettings({ 'ext-a/a': { visible: false, opacity: 0.2 } });
    r.setDefinitions(defs('ext-a', def('a', { visible: true, opacity: 1 })));
    expect(r.entry('ext-a/a')).toMatchObject({ visible: false, opacity: 0.2 });
  });

  it(`suspends shown overlays beyond the budget of ${MAX_ACTIVE_OVERLAYS}`, () => {
    const r = new OverlayRegistry();
    const ids = Array.from(
      { length: MAX_ACTIVE_OVERLAYS + 2 },
      (_, i) => `o${i}`
    );
    r.setDefinitions(defs('ext-a', ...ids.map((id) => def(id))));
    r.setVisibility(['ext-a/o1'], false);
    const suspended = r
      .entries()
      .filter((e) => e.suspended)
      .map((e) => e.id);
    // o1 is hidden, so it does not count; the last shown one is over budget
    expect(suspended).toEqual([`o${MAX_ACTIVE_OVERLAYS + 1}`]);
    expect(r.active()).toHaveLength(MAX_ACTIVE_OVERLAYS);
  });

  it('lists only the asking extension’s overlays', () => {
    const r = new OverlayRegistry();
    r.setDefinitions([...defs('ext-a', def('a')), ...defs('ext-b', def('b'))]);
    expect(r.list('ext-a')).toEqual([
      {
        id: 'a',
        title: 'A',
        type: 'image',
        band: 'aboveCharts',
        visible: true,
        opacity: 1,
        suspended: false
      }
    ]);
    expect(() => r.requireOwn('ext-a', ['b'])).toThrow(OverlayRefusal);
  });
});

describe('OverlayRegistry configuration panels', () => {
  const panel = (
    id: string,
    extra: Partial<PanelContribution> = {}
  ): PanelContribution => ({
    id,
    title: id,
    type: 'iframe',
    url: `/plotterext/${id}.html`,
    ...extra
  });

  const withPanels = (
    contrib: OverlayContribution,
    panels: PanelContribution[]
  ): OverlayDefinition[] => [
    { extension: 'ext-a', extensionName: 'ext-a plugin', def: contrib, panels }
  ];

  it('resolves a configPanel naming an iframe panel of the manifest', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(
      withPanels(def('a', { configPanel: 'cfg' }), [panel('cfg')])
    );
    expect(r.entries()[0].configPanel).toBe('cfg');
  });

  it.each([
    ['names no panel', [panel('other')]],
    ['names a non-iframe panel', [panel('cfg', { type: 'customElement' })]],
    ['names a panel with no url', [panel('cfg', { url: undefined })]],
    ['names a panel for a newer host API', [panel('cfg', { apiVersion: '2' })]]
  ])('ignores a configPanel that %s', (_why, panels) => {
    const r = new OverlayRegistry();
    r.setDefinitions(withPanels(def('a', { configPanel: 'cfg' }), panels));
    expect(r.entries()[0].configPanel).toBeUndefined();
  });

  it('opens only a usable configuration panel, through the host', () => {
    const r = new OverlayRegistry();
    const opener = vi.fn();
    r.setConfigOpener(opener);
    r.setDefinitions([
      ...withPanels(def('a', { configPanel: 'cfg' }), [panel('cfg')]),
      ...withPanels(def('b', { configPanel: 'gone' }), [panel('cfg')])
    ]);
    r.openConfigPanel('ext-a/b');
    r.openConfigPanel('ext-a/missing');
    expect(opener).not.toHaveBeenCalled();
    r.openConfigPanel('ext-a/a');
    expect(opener).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'ext-a/a', configPanel: 'cfg' })
    );
  });

  it('carries a positive preferredPixelRatio and drops a bad one', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(
      defs(
        'ext-a',
        def('a', { preferredPixelRatio: 2 }),
        def('b', { preferredPixelRatio: 0 }),
        def('c', { preferredPixelRatio: 'x' as never }),
        def('d')
      )
    );
    expect(r.entries().map((e) => e.preferredPixelRatio)).toEqual([
      2,
      undefined,
      undefined,
      undefined
    ]);
  });
});

describe('OverlayRegistry interactive data overlays (actions.overlay)', () => {
  // only a data overlay has a model; its contents do not matter here
  const data = (d: OverlayContribution): OverlayDefinition => ({
    extension: 'ext-a',
    extensionName: 'ext-a plugin',
    def: { ...d, type: 'data' },
    model: {} as never
  });

  it('carries interactive, interactiveLayers and titleProperty', () => {
    const r = new OverlayRegistry();
    r.setDefinitions([
      data(
        def('a', {
          interactive: true,
          interactiveLayers: ['icons'],
          titleProperty: 'station'
        })
      )
    ]);
    expect(r.entries()[0]).toMatchObject({
      interactive: true,
      interactiveLayers: ['icons'],
      titleProperty: 'station'
    });
  });

  it('defaults to not interactive, every layer, and the name property', () => {
    const r = new OverlayRegistry();
    r.setDefinitions([
      data(def('a')),
      data(def('b', { interactive: 'yes' as never })),
      data(
        def('c', {
          interactive: true,
          interactiveLayers: 'icons' as never,
          titleProperty: '' as never
        })
      )
    ]);
    expect(r.entries().map((e) => e.interactive)).toEqual([false, false, true]);
    expect(r.entries()[2].interactiveLayers).toBeUndefined();
    expect(r.entries().map((e) => e.titleProperty)).toEqual([
      'name',
      'name',
      'name'
    ]);
  });

  it('never makes an image overlay interactive', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(defs('ext-a', def('a', { interactive: true })));
    expect(r.entries()[0].interactive).toBe(false);
  });
});

describe('OverlayRegistry frames', () => {
  function rig(now = () => 0) {
    const r = new OverlayRegistry();
    r.now = now;
    r.setDefinitions(defs('ext-a', def('a')));
    const delivered: Array<{ extent: number[] }> = [];
    r.registerSink('ext-a/a', (f) => delivered.push(f));
    return { r, delivered };
  }

  it('hands an answering frame to the layer, shifted into the viewed world copy', () => {
    const { r, delivered } = rig();
    const W = 40075016.68557849;
    const req = r.newRequest('ext-a/a', VIEW, W)!;
    const image = fakeImage();
    expect(
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'a',
        requestId: req.requestId,
        extent: VIEW.extent,
        image
      })
    ).toEqual({ accepted: true });
    expect(delivered[0].extent).toEqual([W, 0, W + 1000, 500]);
    expect(image.close).not.toHaveBeenCalled(); // the layer closes it
  });

  it('refuses a frame for a superseded request, and closes it', () => {
    const { r, delivered } = rig();
    const first = r.newRequest('ext-a/a', VIEW, 0)!;
    r.newRequest('ext-a/a', VIEW, 0);
    const image = fakeImage();
    expect(
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'a',
        requestId: first.requestId,
        extent: VIEW.extent,
        image
      })
    ).toEqual({ accepted: false, reason: 'overlays.superseded' });
    expect(image.close).toHaveBeenCalled();
    expect(delivered).toHaveLength(0);
  });

  it('a frame for an older request of another size is superseded, not an error', () => {
    const { r } = rig();
    const first = r.newRequest('ext-a/a', VIEW, 0)!;
    r.newRequest('ext-a/a', { ...VIEW, width: 120, height: 60 }, 0);
    const answer = (requestId?: string) =>
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'a',
        requestId,
        extent: VIEW.extent,
        image: fakeImage(100, 50)
      });
    expect(answer(first.requestId)).toEqual({
      accepted: false,
      reason: 'overlays.superseded'
    });
    // a live frame still drawn for the old size raced the new request
    expect(answer()).toEqual({
      accepted: false,
      reason: 'overlays.superseded'
    });
    // a live frame matching neither size is a sizing bug, not a race
    expect(() =>
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'a',
        extent: VIEW.extent,
        image: fakeImage(77, 33)
      })
    ).toThrow(expect.objectContaining({ reason: 'overlays.badRequest' }));
  });

  it('only the overlay’s own runtime may send its frames', () => {
    const { r } = rig();
    r.newRequest('ext-a/a', VIEW, 0);
    const send = (ext: string, runtime: string | null) => () =>
      r.acceptFrame(ext, runtime, {
        overlayId: 'a',
        extent: VIEW.extent,
        image: fakeImage()
      });
    expect(send('ext-a', 'other')).toThrow(/No overlay/);
    expect(send('ext-a', null)).toThrow(/No overlay/);
    expect(send('ext-b', 'renderer')).toThrow(/No overlay/);
  });

  it('rejects a frame whose size does not match its request', () => {
    const { r } = rig();
    const req = r.newRequest('ext-a/a', VIEW, 0)!;
    const image = fakeImage(99, 50);
    expect(() =>
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'a',
        requestId: req.requestId,
        extent: VIEW.extent,
        image
      })
    ).toThrow(expect.objectContaining({ reason: 'overlays.badRequest' }));
    expect(image.close).toHaveBeenCalled();
  });

  it('states the live-frame pace it enforces on every request', () => {
    const { r } = rig();
    expect(r.newRequest('ext-a/a', VIEW, 0)!.liveInterval).toBe(
      LIVE_FRAME_MIN_INTERVAL_MS
    );
  });

  it('throttles live frames to the host’s pace', () => {
    let t = 1000;
    const { r, delivered } = rig(() => t);
    r.newRequest('ext-a/a', VIEW, 0);
    const live = () =>
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'a',
        extent: VIEW.extent,
        image: fakeImage()
      });
    expect(live()).toEqual({ accepted: true });
    t += LIVE_FRAME_MIN_INTERVAL_MS - 1;
    expect(live()).toEqual({ accepted: false, reason: 'overlays.throttled' });
    t += 1;
    expect(live()).toEqual({ accepted: true });
    expect(delivered).toHaveLength(2);
  });

  it('refuses frames while there is no request or no layer to draw them', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(defs('ext-a', def('a')));
    const frame = () =>
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'a',
        extent: VIEW.extent,
        image: fakeImage()
      });
    expect(frame()).toEqual({ accepted: false, reason: 'overlays.superseded' });
    r.newRequest('ext-a/a', VIEW, 0);
    expect(frame()).toEqual({ accepted: false, reason: 'overlays.superseded' });
  });

  it('replays only the latest request of a runtime’s active overlays', () => {
    const r = new OverlayRegistry();
    r.setDefinitions([
      ...defs('ext-a', def('a'), def('b', { runtime: 'other' }), def('c')),
      ...defs('ext-b', def('a'))
    ]);
    r.newRequest('ext-a/a', VIEW, 0);
    const latest = r.newRequest('ext-a/a', VIEW, 0)!;
    r.newRequest('ext-a/b', VIEW, 0);
    r.newRequest('ext-b/a', VIEW, 0);
    expect(r.latestRequestsFor('ext-a', 'renderer')).toEqual([latest]);
    r.setVisibility(['ext-a/a'], false);
    expect(r.latestRequestsFor('ext-a', 'renderer')).toEqual([]);
  });
});

describe('OverlayRegistry animated overlays (overlays.animated)', () => {
  const interval = (r: OverlayRegistry, key: string) =>
    r.entry(key)?.liveInterval;

  it('grants an animated overlay its preferred interval, never below 30 fps', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(
      defs(
        'ext-a',
        def('wind', { preferredLiveInterval: 50 }),
        def('fast', { preferredLiveInterval: 5 })
      )
    );
    // only one animates at a time; the other keeps the normal pace
    expect(interval(r, 'ext-a/wind')).toBe(50);
    expect(r.entry('ext-a/wind')?.animated).toBe(true);
    expect(interval(r, 'ext-a/fast')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
    expect(r.entry('ext-a/fast')?.animated).toBe(false);
    r.setVisibility(['ext-a/wind'], false);
    expect(interval(r, 'ext-a/fast')).toBe(ANIMATED_MIN_INTERVAL_MS);
  });

  it('keeps the normal pace without a preference, and a slower one when asked', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(
      defs(
        'ext-a',
        def('still'),
        def('slow', { preferredLiveInterval: 1000 }),
        def('bad', { preferredLiveInterval: -3 })
      )
    );
    expect(interval(r, 'ext-a/still')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
    expect(interval(r, 'ext-a/slow')).toBe(1000);
    expect(r.entry('ext-a/slow')?.animated).toBe(false);
    expect(interval(r, 'ext-a/bad')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
  });

  it('does not animate under reduced motion', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(defs('ext-a', def('wind', { preferredLiveInterval: 40 })));
    r.setReducedMotion(true);
    expect(interval(r, 'ext-a/wind')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
    r.setReducedMotion(false);
    expect(interval(r, 'ext-a/wind')).toBe(40);
  });

  it('states and enforces the granted interval', () => {
    let t = 1000;
    const r = new OverlayRegistry();
    r.now = () => t;
    r.setDefinitions(defs('ext-a', def('wind', { preferredLiveInterval: 40 })));
    r.registerSink('ext-a/wind', () => undefined);
    expect(r.newRequest('ext-a/wind', VIEW, 0)!.liveInterval).toBe(40);
    const live = () =>
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'wind',
        extent: VIEW.extent,
        image: fakeImage()
      });
    expect(live()).toEqual({ accepted: true });
    t += 39;
    expect(live()).toEqual({ accepted: false, reason: 'overlays.throttled' });
    t += 1;
    expect(live()).toEqual({ accepted: true });
  });

  /**
   * A registry with one animated overlay (`wind`, 40 ms) and a clock, plus
   * `run(cost)`: one window of compositions, one per granted interval, each
   * costing `cost` ms.
   */
  function animatedRig() {
    let t = 0;
    const r = new OverlayRegistry();
    r.now = () => t;
    r.setDefinitions(
      defs(
        'ext-a',
        def('wind', { preferredLiveInterval: 40 }),
        def('rain', { preferredLiveInterval: 50 })
      )
    );
    const run = (cost: number) => {
      const end = t + BACKOFF_SETTLE_MS;
      while (t <= end) {
        r.reportFrameCost(cost);
        t += r.entries().find((e) => e.animated)!.liveInterval!;
      }
    };
    return { r, run, tick: (ms: number) => (t += ms) };
  }

  it('backs off when compositing takes over half the time, one step per window', () => {
    const { r, run } = animatedRig();
    run(5);
    expect(interval(r, 'ext-a/wind')).toBe(40);
    run(25);
    expect(interval(r, 'ext-a/wind')).toBe(80);
    run(60);
    expect(interval(r, 'ext-a/wind')).toBe(160);
    run(150);
    expect(interval(r, 'ext-a/wind')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
    run(150);
    expect(interval(r, 'ext-a/wind')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
  });

  it('recovers one step per window once the faster interval would be cheap', () => {
    const { r, run } = animatedRig();
    run(25);
    run(60);
    run(150);
    expect(interval(r, 'ext-a/wind')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
    run(1);
    expect(interval(r, 'ext-a/wind')).toBe(160);
    run(1);
    expect(interval(r, 'ext-a/wind')).toBe(80);
    run(1);
    expect(interval(r, 'ext-a/wind')).toBe(40);
  });

  it('does not flip-flop: recovers only when the faster interval stays well under half', () => {
    const { r, run } = animatedRig();
    run(30);
    expect(interval(r, 'ext-a/wind')).toBe(80);
    // 15 ms per 80 ms frame; at 40 ms that would be 37%: too close to 50%
    run(15);
    expect(interval(r, 'ext-a/wind')).toBe(80);
    // 12 ms would be 30% at 40 ms: safe to go back
    run(12);
    expect(interval(r, 'ext-a/wind')).toBe(40);
  });

  it('never backs off for one slow composition, at the start or later', () => {
    const { r, run } = animatedRig();
    r.reportFrameCost(500);
    run(5);
    expect(interval(r, 'ext-a/wind')).toBe(40);
    run(5);
    r.reportFrameCost(100);
    run(5);
    expect(interval(r, 'ext-a/wind')).toBe(40);
  });

  it('starts afresh for another overlay, and after a pause', () => {
    const { r, run, tick } = animatedRig();
    run(30);
    expect(interval(r, 'ext-a/wind')).toBe(80);
    // the slot passes to rain: it starts at its own preference
    r.setVisibility(['ext-a/wind'], false);
    expect(interval(r, 'ext-a/rain')).toBe(50);
    r.reportFrameCost(500);
    expect(interval(r, 'ext-a/rain')).toBe(50);
    // a pause: the next window starts at the next sample
    tick(BACKOFF_SETTLE_MS * 3);
    r.reportFrameCost(500);
    expect(interval(r, 'ext-a/rain')).toBe(50);
  });

  it('gives the slot to an overlay the map draws, not one outside its zoom range', () => {
    const { r } = animatedRig();
    r.setInRange('ext-a/wind', false);
    expect(r.entry('ext-a/wind')?.animated).toBe(false);
    expect(interval(r, 'ext-a/wind')).toBe(LIVE_FRAME_MIN_INTERVAL_MS);
    expect(interval(r, 'ext-a/rain')).toBe(50);
    r.setInRange('ext-a/wind', true);
    expect(interval(r, 'ext-a/wind')).toBe(40);
  });

  it('refuses live frames while the view moves, and takes them again after', () => {
    let t = 1000;
    const r = new OverlayRegistry();
    r.now = () => t;
    r.setDefinitions(defs('ext-a', def('wind', { preferredLiveInterval: 40 })));
    r.registerSink('ext-a/wind', () => undefined);
    const req = r.newRequest('ext-a/wind', VIEW, 0)!;
    const live = () =>
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'wind',
        extent: VIEW.extent,
        image: fakeImage()
      });
    r.setMoving('ext-a/wind', true);
    expect(live()).toEqual({ accepted: false, reason: 'overlays.throttled' });
    // an answer to the request is still taken
    expect(
      r.acceptFrame('ext-a', 'renderer', {
        overlayId: 'wind',
        requestId: req.requestId,
        extent: VIEW.extent,
        image: fakeImage()
      })
    ).toEqual({ accepted: true });
    r.setMoving('ext-a/wind', false);
    t += 40;
    expect(live()).toEqual({ accepted: true });
  });

  it('replays a request with the interval granted now', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(defs('ext-a', def('wind', { preferredLiveInterval: 40 })));
    r.newRequest('ext-a/wind', VIEW, 0);
    r.setReducedMotion(true);
    expect(r.latestRequestsFor('ext-a', 'renderer')[0].liveInterval).toBe(
      LIVE_FRAME_MIN_INTERVAL_MS
    );
  });

  it('ignores frame costs while nothing animates', () => {
    const r = new OverlayRegistry();
    r.setDefinitions(defs('ext-a', def('still')));
    r.reportFrameCost(500);
    r.setDefinitions(defs('ext-a', def('wind', { preferredLiveInterval: 40 })));
    expect(interval(r, 'ext-a/wind')).toBe(40);
  });
});
