import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PanelContribution } from '../types';
import {
  ExtWindowService,
  MAX_WINDOWS,
  WINDOW_GEOMETRY_KEY
} from './window.service';
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

  it('shows windows as sheets, and modal ones full screen, on a narrow area', () => {
    const w = open({ geometry: { width: 300, height: 300 } });
    const m = open({ modal: true });
    service.setArea({ w: 400, h: 800 });
    expect(service.stateOf(w)).toMatchObject({
      presentation: 'sheet',
      bounds: { x: 0, y: 500, width: 400, height: 300 }
    });
    expect(service.stateOf(m)).toMatchObject({
      presentation: 'fullscreen',
      bounds: { x: 0, y: 0, width: 400, height: 800 }
    });
    expect(changes.filter((c) => c.event === 'window.state').length).toBe(2);
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
});
