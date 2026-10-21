import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PanelContribution } from '../types';
import {
  ExtWindowService,
  MAX_WINDOWS,
  WINDOW_GEOMETRY_KEY
} from './window.service';
import type { WindowState } from 'signalk-plotterext-bus/host';
import { ExtWindow, WindowChange } from './types';

const panel: PanelContribution = {
  id: 'viewer',
  title: 'Viewer',
  type: 'iframe',
  url: '/plotterext/ext-a/viewer.html'
};

describe('ExtWindowService', () => {
  let service: ExtWindowService;
  let changes: WindowChange[];

  const open = (req = {}, extension = 'ext-a') => {
    const w = service.open(extension, panel, req);
    if (typeof w === 'string') throw new Error(w);
    return w;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtWindowService);
    service.area.set({ w: 1000, h: 800 });
    changes = [];
    service.changes.subscribe((c) => changes.push(c));
  });

  it('opens a window with the spec defaults, at the top right', () => {
    const w = open();
    expect(w).toMatchObject<Partial<ExtWindow>>({
      extension: 'ext-a',
      title: 'Viewer',
      params: {},
      modal: false,
      resizable: true,
      movable: true,
      titleBar: 'fixed',
      userClose: 'close',
      visible: true,
      collapsed: false,
      opacity: 1
    });
    const s = service.stateOf(w);
    expect(s).toMatchObject({
      windowId: w.id,
      panel: 'viewer',
      presentation: 'floating',
      area: { width: 1000, height: 800 },
      poppedOut: false
    });
    // 35% of the area, 16px in from the top-right corner
    expect(s.bounds).toEqual({ x: 634, y: 16, width: 350, height: 280 });
    expect(service.zOrder()).toEqual([w.id]);
    expect(changes).toEqual([]);
  });

  it('centres a modal window with no geometry', () => {
    const w = open({ modal: true });
    expect(service.stateOf(w).bounds).toEqual({
      x: 250,
      y: 200,
      width: 500,
      height: 400
    });
  });

  it('centres a modal window whose geometry names no anchor', () => {
    const w = open({ modal: true, geometry: { width: 360, height: 200 } });
    expect(service.stateOf(w).bounds).toEqual({
      x: 320,
      y: 300,
      width: 360,
      height: 200
    });
  });

  it('at the limit, closes the oldest hidden window to make room', () => {
    const first = open();
    const hidden = open({ visible: false });
    for (let i = 2; i < MAX_WINDOWS; i++) open();
    const late = service.open('ext-b', panel, {});
    expect(typeof late).not.toBe('string');
    expect(service.get(hidden.id)).toBeUndefined();
    expect(service.get(first.id)).toBeDefined();
    expect(changes).toContainEqual({
      extension: 'ext-a',
      event: 'window.closed',
      payload: { windowId: hidden.id, reason: 'host' }
    });
  });

  it('does not reclaim a hidden window for an open that fails anyway', () => {
    open({ modal: true });
    const hidden = open({ visible: false });
    for (let i = 2; i < MAX_WINDOWS; i++) open();
    expect(service.open('ext-a', panel, { modal: true })).toBe('modalOpen');
    expect(service.get(hidden.id)).toBeDefined();
  });

  it('refuses more than MAX_WINDOWS windows, and a second modal one', () => {
    open({ modal: true });
    expect(service.open('ext-a', panel, { modal: true })).toBe('modalOpen');
    for (let i = 1; i < MAX_WINDOWS; i++) open();
    expect(service.open('ext-a', panel, {})).toBe('limit');
  });

  it('keeps a modal window above windows opened or raised after it', () => {
    const a = open();
    const m = open({ modal: true });
    const b = open();
    expect(service.zOrder()).toEqual([a.id, b.id, m.id]);
    service.focus(a.id);
    expect(service.zOrder()).toEqual([b.id, a.id, m.id]);
    expect(service.activeModal()?.id).toBe(m.id);
  });

  it('reports a visibility change as window.state and showing raises the window', () => {
    const a = open();
    const b = open();
    service.update(a.id, { visible: false });
    expect(changes).toEqual([
      {
        extension: 'ext-a',
        event: 'window.state',
        payload: expect.objectContaining({ windowId: a.id, visible: false })
      }
    ]);
    service.update(a.id, { visible: true });
    expect(service.zOrder()).toEqual([b.id, a.id]);
  });

  it('reports a geometry change as window.bounds, once', () => {
    const w = open();
    service.update(w.id, { geometry: { width: 500 } });
    service.update(w.id, { geometry: { width: 500 } });
    expect(changes).toEqual([
      {
        extension: 'ext-a',
        event: 'window.bounds',
        payload: {
          windowId: w.id,
          bounds: { x: 484, y: 16, width: 500, height: 280 },
          area: { width: 1000, height: 800 }
        }
      }
    ]);
  });

  it('re-resolves windows when the area changes, keeping them anchored', () => {
    const w = open({
      geometry: { anchor: 'bottom-right', width: 200, height: 150 }
    });
    service.setArea({ w: 800, h: 600 });
    expect(service.stateOf(w).bounds).toEqual({
      x: 600,
      y: 450,
      width: 200,
      height: 150
    });
    expect(changes.map((c) => c.event)).toEqual(['window.bounds']);
  });

  it('does not re-send bounds for a window the area change did not move', () => {
    open({ geometry: { anchor: 'top-left', width: 200, height: 150 } });
    service.setArea({ w: 900, h: 700 });
    expect(changes).toEqual([]);
  });

  it('keeps only spec fields from a remembered geometry', () => {
    localStorage.setItem(
      WINDOW_GEOMETRY_KEY,
      JSON.stringify({ 'ext-a': { k: { width: 300, blob: 'x' } } })
    );
    const w = open({ restoreKey: 'k' });
    expect(w.geometry).toEqual({ width: 300 });
  });

  it('ignores a remembered geometry that is not valid', () => {
    localStorage.setItem(
      WINDOW_GEOMETRY_KEY,
      JSON.stringify({ 'ext-a': { k: { anchor: 'nowhere', width: -3 } } })
    );
    const w = open({ restoreKey: 'k' });
    expect(service.stateOf(w).bounds.x).toBe(634);
  });

  it('keeps windows that fit floating on a narrow area', () => {
    service.setArea({ w: 375, h: 667 });
    const w = open({
      geometry: {
        anchor: 'bottom-left',
        offset: { x: 8, y: 8 },
        width: 200,
        height: 150
      }
    });
    const d = open();
    const m = open({ modal: true });
    expect(service.stateOf(w)).toMatchObject({
      presentation: 'floating',
      bounds: { x: 8, y: 509, width: 200, height: 150 }
    });
    // 35% of 375px is below the host minimum, which still fits
    expect(service.stateOf(d)).toMatchObject({
      presentation: 'floating',
      bounds: { width: 160 }
    });
    // a modal window that fits stays a centred dialog
    expect(service.stateOf(m)).toMatchObject({
      presentation: 'floating',
      bounds: { x: 94, y: 167, width: 188, height: 334 }
    });
  });

  it('shrinks windows too large for a narrow area to fit, still floating; modal ones go full screen', () => {
    service.setArea({ w: 375, h: 667 });
    const w = open({ geometry: { width: 500, height: 300 } });
    const m = open({ modal: true, geometry: { minWidth: 400 } });
    expect(service.stateOf(w)).toMatchObject({
      presentation: 'floating',
      bounds: { x: 0, y: 0, width: 375, height: 225 }
    });
    expect(service.stateOf(m)).toMatchObject({
      presentation: 'fullscreen',
      bounds: { x: 0, y: 0, width: 375, height: 667 }
    });
  });

  it('keeps a window the user dragged to the full width of a fractional area floating', () => {
    service.setArea({ w: 392.73, h: 700.4 });
    const w = open({
      geometry: { anchor: 'bottom-left', width: '100%', height: '30%' }
    });
    service.setRectFromGesture(w.id, { ...service.rectOf(w), y: 100 });
    const moved = service.get(w.id);
    expect(moved?.geometry.width).toBe(393);
    expect(moved && service.presentation(moved)).toBe('floating');
  });

  it('keeps a window floating when the area stops fitting it; only a modal one goes full screen and back', () => {
    const w = open({ geometry: { width: 300, height: 300 } });
    const m = open({ modal: true, geometry: { width: 300, height: 300 } });
    service.setArea({ w: 280, h: 800 });
    expect(service.stateOf(w)).toMatchObject({
      presentation: 'floating',
      bounds: { width: 280, height: 280 }
    });
    expect(service.stateOf(m).presentation).toBe('fullscreen');
    service.setArea({ w: 400, h: 800 });
    expect(service.stateOf(w)).toMatchObject({
      presentation: 'floating',
      bounds: { width: 300, height: 300 }
    });
    expect(service.stateOf(m).presentation).toBe('floating');
    const states = changes.filter((c) => c.event === 'window.state');
    expect(
      states.map((c) => [
        c.payload.windowId,
        (c.payload as WindowState).presentation
      ])
    ).toEqual([
      [m.id, 'fullscreen'],
      [m.id, 'floating']
    ]);
    // the shrunk window reported its new size instead
    expect(
      changes.filter(
        (c) => c.event === 'window.bounds' && c.payload.windowId === w.id
      )
    ).toHaveLength(2);
  });

  it('closes or hides from the user control, as the window asked', () => {
    const c = open();
    const h = open({ userClose: 'hide' });
    service.userClose(h.id);
    expect(service.get(h.id)?.visible).toBe(false);
    service.userClose(c.id);
    expect(service.get(c.id)).toBeUndefined();
    expect(changes.at(-1)).toEqual({
      extension: 'ext-a',
      event: 'window.closed',
      payload: { windowId: c.id, reason: 'user' }
    });
  });

  it("closes a departed extension's windows without a word", () => {
    open({}, 'ext-a');
    const b = open({}, 'ext-b');
    service.closeExtension('ext-a');
    expect(service.windows().map((w) => w.id)).toEqual([b.id]);
    expect(changes).toEqual([]);
  });

  it('closes windows whose panel left the manifest, as reason host', () => {
    const w = open();
    service.closeMissingPanels('ext-a', new Set(['other']));
    expect(changes).toEqual([
      {
        extension: 'ext-a',
        event: 'window.closed',
        payload: { windowId: w.id, reason: 'host' }
      }
    ]);
  });

  it('anchors a user-moved window to its nearest edges and reports it', () => {
    const w = open();
    service.setRectFromGesture(w.id, { x: 20, y: 600, w: 300, h: 180 });
    expect(service.get(w.id)?.geometry).toEqual({
      anchor: 'bottom-left',
      offset: { x: 20, y: 20 },
      width: 300,
      height: 180
    });
    expect(changes.map((c) => c.event)).toEqual(['window.bounds']);
  });

  it('remembers geometry per device under a restoreKey and reopens there', () => {
    const w = open({ restoreKey: 'sounder' });
    service.setRectFromGesture(w.id, { x: 20, y: 600, w: 300, h: 180 });
    expect(
      JSON.parse(localStorage.getItem(WINDOW_GEOMETRY_KEY) ?? '{}')
    ).toEqual({
      'ext-a': {
        sounder: {
          anchor: 'bottom-left',
          offset: { x: 20, y: 20 },
          width: 300,
          height: 180
        }
      }
    });
    service.close(w.id, 'user');
    const again = open({
      restoreKey: 'sounder',
      geometry: { anchor: 'center', width: 100, height: 100 }
    });
    expect(service.stateOf(again).bounds).toEqual({
      x: 20,
      y: 600,
      width: 300,
      height: 180
    });
    // a different extension's key of the same name is its own
    const other = open({ restoreKey: 'sounder' }, 'ext-b');
    expect(service.stateOf(other).bounds.x).toBe(634);
  });

  it('clamps opacity to the allowed range', () => {
    const w = open();
    service.setOpacity(w.id, 0.1);
    expect(service.get(w.id)?.opacity).toBe(0.3);
    service.setOpacity(w.id, Number.NaN);
    expect(service.get(w.id)?.opacity).toBe(1);
  });

  describe('reaching over the right toolbar column', () => {
    beforeEach(() => service.setArea({ w: 1000, h: 800 }, 54));

    it('places windows clear of the column, whatever the extension asks', () => {
      expect(service.stateOf(open()).bounds.x).toBe(634);
      const pushed = open({
        geometry: { anchor: 'top-right', offset: { x: -100 }, width: 350 }
      });
      const b = service.stateOf(pushed).bounds;
      expect(b.x + b.width).toBe(1000);
    });

    it('lets the user put a window over the column, and keeps it there as the area changes', () => {
      const w = open();
      service.setRectFromGesture(w.id, { x: 704, y: 16, w: 350, h: 280 });
      expect(service.get(w.id)?.userPlaced).toBe(true);
      const s = service.stateOf(service.get(w.id)!);
      expect(s.bounds).toEqual({ x: 704, y: 16, width: 350, height: 280 });
      expect(s.area).toEqual({ width: 1000, height: 800 });
      changes.length = 0;
      service.setArea({ w: 800, h: 800 }, 54);
      expect(service.stateOf(service.get(w.id)!).bounds.x).toBe(504);
      expect(changes.map((c) => c.event)).toEqual(['window.bounds']);
    });

    it('keeps a modal window and its gestures inside the window area', () => {
      const m = open({ modal: true });
      expect(service.gestureArea(m)).toEqual({ w: 1000, h: 800 });
      service.setRectFromGesture(m.id, { x: 650, y: 16, w: 350, h: 280 });
      expect(service.get(m.id)?.userPlaced).toBe(false);
      const b = service.stateOf(service.get(m.id)!).bounds;
      expect(b.x + b.width).toBe(1000);
    });

    it('on a narrow area, lets a window whose minWidth does not fit cover the column', () => {
      service.setArea({ w: 282, h: 700 }, 54);
      const wide = open({
        geometry: { width: 320, minWidth: 320, height: 300 }
      });
      expect(service.stateOf(wide).bounds).toEqual({
        x: 0,
        y: 0,
        width: 320,
        height: 300
      });
      // asked wider than its minimum: it covers only what the minimum needs
      const wider = open({
        geometry: { width: 400, minWidth: 300, height: 300 }
      });
      expect(service.stateOf(wider).bounds).toMatchObject({
        x: 0,
        width: 300
      });
      // without a minimum it is shrunk to fit, as before
      const shrunk = open({ geometry: { width: 320, height: 300 } });
      expect(service.stateOf(shrunk).bounds.width).toBe(282);
    });

    it('does not let a minWidth reach the column on a wide area', () => {
      service.setArea({ w: 700, h: 700 }, 54);
      const w = open({ geometry: { minWidth: 740, height: 300 } });
      expect(service.stateOf(w).bounds.width).toBe(700);
    });

    it('never pushes a window the user left inside the area onto the column', () => {
      service.setArea({ w: 700, h: 800 }, 54);
      const w = open();
      service.setRectFromGesture(w.id, { x: 300, y: 16, w: 350, h: 280 });
      expect(service.get(w.id)?.userPlaced).toBe(false);
      service.setArea({ w: 500, h: 800 }, 54);
      const b = service.stateOf(service.get(w.id)!).bounds;
      expect(b.x + b.width).toBeLessThanOrEqual(500);
      // a phone rotated to portrait shrinks it to the area, not the reach
      service.setArea({ w: 736, h: 400 }, 54);
      service.setRectFromGesture(w.id, { x: 193, y: 16, w: 350, h: 280 });
      service.setArea({ w: 282, h: 700 }, 54);
      expect(service.stateOf(service.get(w.id)!).bounds.width).toBe(282);
    });

    it('treats a window moved back inside the area as inside again', () => {
      const w = open();
      service.setRectFromGesture(w.id, { x: 704, y: 16, w: 350, h: 280 });
      service.setRectFromGesture(w.id, { x: 650, y: 16, w: 350, h: 280 });
      expect(service.get(w.id)?.userPlaced).toBe(false);
    });

    it('hands placement back to the extension when it changes the geometry', () => {
      const w = open();
      service.setRectFromGesture(w.id, { x: 704, y: 16, w: 350, h: 280 });
      service.update(w.id, { geometry: { height: 200 } });
      expect(service.get(w.id)?.userPlaced).toBe(false);
      const b = service.stateOf(service.get(w.id)!).bounds;
      expect(b.x + b.width).toBeLessThanOrEqual(1000);
    });

    it('remembers that the user put a window over the column', () => {
      const w = open({ restoreKey: 'sight' });
      service.setRectFromGesture(w.id, { x: 704, y: 16, w: 350, h: 280 });
      const stored = JSON.parse(
        localStorage.getItem(WINDOW_GEOMETRY_KEY) ?? '{}'
      )['ext-a'].sight;
      expect(stored.fbUserPlaced).toBe(true);
      service.close(w.id, 'user');
      const again = open({ restoreKey: 'sight' });
      expect(again.userPlaced).toBe(true);
      expect(again.geometry).not.toHaveProperty('fbUserPlaced');
      expect(service.stateOf(again).bounds.x).toBe(704);
    });

    it('lets nothing reach without a column (kiosk mode)', () => {
      service.setArea({ w: 1000, h: 800 }, 0);
      const w = open();
      expect(service.gestureArea(w)).toEqual({ w: 1000, h: 800 });
      service.setRectFromGesture(w.id, { x: 704, y: 16, w: 350, h: 280 });
      const b = service.stateOf(service.get(w.id)!).bounds;
      expect(b.x + b.width).toBe(1000);
    });
  });
});
