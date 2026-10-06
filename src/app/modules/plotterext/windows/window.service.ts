import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import * as uuid from 'uuid';
import type {
  WindowGeometry,
  WindowPresentation,
  WindowState
} from 'signalk-plotterext-bus/host';
import { PanelContribution } from '../types';
import {
  DEFAULT_GEOMETRY,
  DEFAULT_LIMITS,
  MODAL_GEOMETRY,
  PxRect,
  ViewportSize,
  anchoredGeometry,
  resolveGeometry
} from './geometry';
import {
  ExtWindow,
  WINDOW_MIN_OPACITY,
  WindowChange,
  WindowCloseReason
} from './types';

/** The most windows open at once, across all extensions (`windows.limit`). */
export const MAX_WINDOWS = 12;
/** Below this window-area width a window is shown as a sheet, not floating. */
export const SHEET_BREAKPOINT = 600;
/** A sheet takes at most this share of the area's height. */
const SHEET_MAX_HEIGHT = 0.6;
/** Device-local store of remembered geometry: extension -> restoreKey -> geometry. */
export const WINDOW_GEOMETRY_KEY = 'fb-plotterext-windows';

/** What an extension asks for when it opens a window (already validated). */
export interface WindowRequest {
  params?: Record<string, unknown>;
  title?: string;
  geometry?: WindowGeometry;
  modal?: boolean;
  resizable?: boolean;
  movable?: boolean;
  titleBar?: 'fixed' | 'autoHide';
  userClose?: 'close' | 'hide';
  visible?: boolean;
  restoreKey?: string;
}

export type OpenFailure = 'limit' | 'modalOpen';

interface Snapshot {
  bounds: string;
  flags: string;
}

/**
 * Owns the extension windows: which are open, their stacking order and the
 * window area they are laid out in. Windows exist only for the life of the
 * page; geometry is remembered per device for windows opened with a
 * `restoreKey`. Every change an extension should hear about is pushed to
 * `changes`, which the plotter extension service relays onto the bus.
 */
@Injectable({ providedIn: 'root' })
export class ExtWindowService {
  /** Open windows, in the order they were opened. */
  readonly windows = signal<ExtWindow[]>([]);
  /** Window ids from back to front. */
  readonly zOrder = signal<string[]>([]);
  /** True while a window is being moved or resized. */
  readonly gestureActive = signal(false);
  /** The window area: the chart area windows float over. */
  readonly area = signal<ViewportSize>({
    w: window.innerWidth,
    h: window.innerHeight
  });

  /** The front-most shown modal window, if any. */
  readonly activeModal = computed(() => {
    const byId = new Map(this.windows().map((w) => [w.id, w]));
    for (const id of [...this.zOrder()].reverse()) {
      const w = byId.get(id);
      if (w?.modal && w.visible) return w;
    }
    return null;
  });

  readonly changes = new Subject<WindowChange>();
  private snapshots = new Map<string, Snapshot>();

  // ---------- reading ----------

  get(id: string): ExtWindow | undefined {
    return this.windows().find((w) => w.id === id);
  }

  /** The windows one extension owns. */
  ofExtension(extension: string): ExtWindow[] {
    return this.windows().filter((w) => w.extension === extension);
  }

  presentation(w: ExtWindow, area = this.area()): WindowPresentation {
    if (area.w >= SHEET_BREAKPOINT) return 'floating';
    return w.modal ? 'fullscreen' : 'sheet';
  }

  /** Where the window is on screen, in px from the window area's top-left. */
  rectOf(w: ExtWindow, area = this.area()): PxRect {
    const presentation = this.presentation(w, area);
    if (presentation === 'fullscreen')
      return { x: 0, y: 0, w: area.w, h: area.h };
    const r = resolveGeometry(w.geometry, area, DEFAULT_LIMITS);
    if (presentation === 'sheet') {
      const h = Math.min(r.h, area.h * SHEET_MAX_HEIGHT);
      return { x: 0, y: area.h - h, w: area.w, h };
    }
    return r;
  }

  stateOf(w: ExtWindow): WindowState {
    const area = this.area();
    const r = this.rectOf(w, area);
    return {
      windowId: w.id,
      panel: w.panel.id,
      title: w.title,
      presentation: this.presentation(w, area),
      bounds: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.w),
        height: Math.round(r.h)
      },
      area: { width: Math.round(area.w), height: Math.round(area.h) },
      visible: w.visible,
      collapsed: w.collapsed,
      poppedOut: false,
      modal: w.modal
    };
  }

  // ---------- opening and closing ----------

  /**
   * Open a window, or report why not. A remembered geometry for the request's
   * `restoreKey` takes the place of the requested one.
   */
  open(
    extension: string,
    panel: PanelContribution,
    req: WindowRequest
  ): ExtWindow | OpenFailure {
    if (this.windows().length >= MAX_WINDOWS) return 'limit';
    const modal = req.modal === true;
    if (modal && this.windows().some((w) => w.modal)) return 'modalOpen';
    const restored = req.restoreKey
      ? this.restoredGeometry(extension, req.restoreKey)
      : undefined;
    const w: ExtWindow = {
      id: uuid.v4(),
      extension,
      panel,
      params: req.params ?? {},
      title: req.title?.trim() || panel.title,
      geometry:
        restored ?? req.geometry ?? (modal ? MODAL_GEOMETRY : DEFAULT_GEOMETRY),
      modal,
      resizable: req.resizable ?? true,
      movable: req.movable ?? true,
      titleBar: req.titleBar ?? 'fixed',
      userClose: req.userClose ?? 'close',
      visible: req.visible ?? true,
      collapsed: false,
      opacity: 1,
      ...(req.restoreKey ? { restoreKey: req.restoreKey } : {})
    };
    this.windows.update((list) => [...list, w]);
    this.zOrder.update((z) => this.modalOnTop([...z, w.id]));
    this.snapshots.set(w.id, this.snapshot(w));
    return w;
  }

  close(id: string, reason: WindowCloseReason) {
    const w = this.get(id);
    if (!w) return;
    this.remove([id]);
    this.changes.next({
      extension: w.extension,
      event: 'window.closed',
      payload: { windowId: id, reason }
    });
  }

  /** The title-bar close control: hides or closes, as the window asked. */
  userClose(id: string) {
    const w = this.get(id);
    if (!w) return;
    if (w.userClose === 'hide' && !w.modal) {
      this.update(id, { visible: false });
    } else {
      this.close(id, 'user');
    }
  }

  /**
   * Close every window of an extension that has left the collection. No event
   * is sent: none of the extension's contexts remain to hear it.
   */
  closeExtension(extension: string) {
    this.remove(this.ofExtension(extension).map((w) => w.id));
  }

  /** Close an extension's windows whose panel is no longer in its manifest. */
  closeMissingPanels(extension: string, panels: Set<string>) {
    for (const w of this.ofExtension(extension)) {
      if (!panels.has(w.panel.id)) this.close(w.id, 'host');
    }
  }

  private remove(ids: string[]) {
    if (!ids.length) return;
    const gone = new Set(ids);
    this.windows.update((list) => list.filter((w) => !gone.has(w.id)));
    this.zOrder.update((z) => z.filter((i) => !gone.has(i)));
    ids.forEach((id) => this.snapshots.delete(id));
  }

  // ---------- changing ----------

  /** Change a window on the extension's behalf (`ui.updateWindow`). */
  update(
    id: string,
    change: { title?: string; geometry?: WindowGeometry; visible?: boolean }
  ) {
    this.patch(id, (w) => ({
      ...(change.title !== undefined ? { title: change.title } : {}),
      ...(change.geometry !== undefined
        ? { geometry: { ...w.geometry, ...change.geometry } }
        : {}),
      ...(change.visible !== undefined ? { visible: change.visible } : {})
    }));
    if (change.visible) this.focus(id);
    if (change.geometry) this.remember(id);
  }

  /** A user move or resize ended at `r` (px, window area). */
  setRectFromGesture(id: string, r: PxRect) {
    this.patch(id, (w) => ({
      geometry: anchoredGeometry(r, this.area(), w.geometry)
    }));
    this.remember(id);
  }

  setCollapsed(id: string, collapsed: boolean) {
    this.patch(id, () => ({ collapsed }));
  }

  setOpacity(id: string, opacity: number) {
    const o = Number.isFinite(opacity)
      ? Math.min(1, Math.max(WINDOW_MIN_OPACITY, opacity))
      : 1;
    this.patch(id, () => ({ opacity: o }));
  }

  /** Bring a window to the front. A modal window stays above the others. */
  focus(id: string) {
    const z = this.zOrder();
    if (!z.includes(id) || z[z.length - 1] === id) return;
    this.zOrder.set(this.modalOnTop([...z.filter((i) => i !== id), id]));
  }

  /** A stacking order with any modal window moved to the front. */
  private modalOnTop(z: string[]): string[] {
    const modal = new Set(
      this.windows()
        .filter((w) => w.modal)
        .map((w) => w.id)
    );
    return [
      ...z.filter((i) => !modal.has(i)),
      ...z.filter((i) => modal.has(i))
    ];
  }

  /** The window area was resized: re-resolve every window against it. */
  setArea(area: ViewportSize) {
    const cur = this.area();
    if (cur.w === area.w && cur.h === area.h) return;
    this.area.set(area);
    this.windows().forEach((w) => this.report(w));
  }

  private patch(id: string, change: (w: ExtWindow) => Partial<ExtWindow>) {
    let changed: ExtWindow | undefined;
    this.windows.update((list) =>
      list.map((w) => (w.id === id ? (changed = { ...w, ...change(w) }) : w))
    );
    if (changed) this.report(changed);
  }

  // ---------- events ----------

  private snapshot(w: ExtWindow): Snapshot {
    const s = this.stateOf(w);
    return {
      bounds: JSON.stringify([s.bounds, s.area]),
      flags: JSON.stringify([
        s.visible,
        s.collapsed,
        s.poppedOut,
        s.presentation,
        s.title
      ])
    };
  }

  /** Tell the extension whatever about `w` changed since it last heard. */
  private report(w: ExtWindow) {
    const prev = this.snapshots.get(w.id);
    const next = this.snapshot(w);
    this.snapshots.set(w.id, next);
    if (!prev) return;
    const state = this.stateOf(w);
    if (prev.bounds !== next.bounds) {
      this.changes.next({
        extension: w.extension,
        event: 'window.bounds',
        payload: { windowId: w.id, bounds: state.bounds, area: state.area }
      });
    }
    if (prev.flags !== next.flags) {
      this.changes.next({
        extension: w.extension,
        event: 'window.state',
        payload: state
      });
    }
  }

  // ---------- remembered geometry ----------

  private readStore(): Record<string, Record<string, WindowGeometry>> {
    try {
      const raw = localStorage.getItem(WINDOW_GEOMETRY_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private restoredGeometry(
    extension: string,
    key: string
  ): WindowGeometry | undefined {
    return this.readStore()[extension]?.[key];
  }

  private remember(id: string) {
    const w = this.get(id);
    if (!w?.restoreKey) return;
    const store = this.readStore();
    store[w.extension] = { ...store[w.extension], [w.restoreKey]: w.geometry };
    try {
      localStorage.setItem(WINDOW_GEOMETRY_KEY, JSON.stringify(store));
    } catch {
      // Storage full or unavailable: the window just won't be remembered.
    }
  }
}
