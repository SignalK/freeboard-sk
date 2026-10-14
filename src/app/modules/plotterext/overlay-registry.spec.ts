import { describe, expect, it, vi } from 'vitest';
import {
  LIVE_FRAME_MIN_INTERVAL_MS,
  MAX_ACTIVE_OVERLAYS,
  OverlayRefusal,
  OverlayRegistry,
  type OverlayDefinition
} from './overlay-registry';
import { OverlayContribution } from './types';

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
        band: 'aboveCharts',
        visible: true,
        opacity: 1,
        suspended: false
      }
    ]);
    expect(() => r.requireOwn('ext-a', ['b'])).toThrow(OverlayRefusal);
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
