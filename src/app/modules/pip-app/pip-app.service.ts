import { Injectable, inject, signal } from '@angular/core';
import { SignalKClient } from 'signalk-client-angular';
import * as uuid from 'uuid';
import { AppFacade } from 'src/app/app.facade';
import { mapWebappList, SKAppsList, WebappEntry } from 'src/app/lib/webapps';
import { clampOpacity, normalisePipApps } from './defs';
import {
  DEFAULT_RECT,
  PxRect,
  ViewportSize,
  clampToViewport,
  isValidRect,
  toFractions
} from './geometry';
import { defaultTitle, parseSource, resolveSourceUrl } from './sources';
import { PipAppDef, PipAppSource, PipRect } from './types';

/** Above this many open windows the user is warned (each one is a full app). */
export const PIP_APP_SOFT_LIMIT = 6;

const sameSource = (a: PipAppSource, b: PipAppSource) =>
  a.kind === 'webapp' && b.kind === 'webapp'
    ? a.path === b.path
    : a.kind === 'url' && b.kind === 'url'
      ? a.url === b.url
      : false;

/** Owns the PiP App windows: what is open, their stacking order and layout. */
@Injectable({ providedIn: 'root' })
export class PipAppService {
  private app = inject(AppFacade);
  private signalk = inject(SignalKClient);

  /** Open windows, in the order they were opened. */
  readonly windows = signal<PipAppDef[]>([]);
  /** Window ids from back to front. */
  readonly zOrder = signal<string[]>([]);
  /** True while a window is being moved or resized. */
  readonly gestureActive = signal(false);
  readonly viewport = signal<ViewportSize>(this.readViewport());
  /** Windows were opened, closed or moved since the config was last loaded. */
  private changedSinceLoad = false;

  /** Installed webapps offered in the launcher menu. */
  readonly webapps = signal<WebappEntry[]>([]);

  constructor() {
    this.load();
    // A login replaces the whole config with the server copy.
    this.app.config$.subscribe((e) => {
      if (e === 'ready') this.onConfigReady();
    });
  }

  /** Absolute URL for a source, or null when it cannot be framed. */
  resolveUrl(source: PipAppSource): string | null {
    return resolveSourceUrl(source, this.app.hostDef.url);
  }

  /**
   * Open a window for `source`, or bring an already open window showing the
   * same source to the front. Returns null for an unusable source.
   */
  open(
    source: PipAppSource,
    title?: string,
    rect: PipRect = DEFAULT_RECT
  ): PipAppDef | null {
    const s = parseSource(source);
    if (!s || !this.resolveUrl(s)) return null;
    const existing = this.windows().find((w) => sameSource(w.source, s));
    if (existing) {
      this.reveal(existing.id);
      return existing;
    }
    const def: PipAppDef = {
      id: uuid.v4(),
      title: title?.trim() || defaultTitle(s),
      source: s,
      rect: isValidRect(rect) ? { ...rect } : { ...DEFAULT_RECT },
      collapsed: false,
      opacity: 1
    };
    this.windows.update((list) => [...list, def]);
    this.zOrder.update((z) => [...z, def.id]);
    if (this.windows().length > PIP_APP_SOFT_LIMIT) {
      this.app.showMessage(
        `${this.windows().length} PiP App windows are open. Each one runs a full app; close those you do not need.`
      );
    }
    this.persist();
    return def;
  }

  close(id: string) {
    this.warnOpenPopups(this.windows().filter((w) => w.id === id));
    this.windows.update((list) => list.filter((w) => w.id !== id));
    this.zOrder.update((z) => z.filter((i) => i !== id));
    this.persist();
  }

  closeAll() {
    this.warnOpenPopups(this.windows());
    this.windows.set([]);
    this.zOrder.set([]);
    this.persist();
  }

  /** A noopener popup is out of reach; only the user can close it. */
  private warnOpenPopups(closing: PipAppDef[]) {
    const titles = closing
      .filter((w) => w.popout === 'popup')
      .map((w) => w.title);
    if (titles.length === 1) {
      this.app.showMessage(
        `${titles[0]} is still open in its separate window. Close it there.`
      );
    } else if (titles.length > 1) {
      this.app.showMessage(
        `${titles.join(', ')} are still open in separate windows. Close them there.`
      );
    }
  }

  /** Bring a window to the front. */
  focus(id: string) {
    const z = this.zOrder();
    if (!z.includes(id) || z[z.length - 1] === id) return;
    this.zOrder.set([...z.filter((i) => i !== id), id]);
  }

  /** Bring a window to the front and expand it if it is collapsed. */
  reveal(id: string) {
    this.focus(id);
    if (this.windows().find((w) => w.id === id)?.collapsed) {
      this.setCollapsed(id, false);
    }
  }

  /** Store a window's new position and size (viewport fractions). */
  setRect(id: string, rect: PipRect) {
    if (!isValidRect(rect)) return;
    this.windows.update((list) =>
      list.map((w) => (w.id === id ? { ...w, rect: { ...rect } } : w))
    );
    this.persist(true);
  }

  setCollapsed(id: string, collapsed: boolean) {
    this.patch(id, { collapsed });
  }

  /** Mark a window as out in a popup (or back in, with null). */
  setPopout(id: string, popout: 'popup' | null) {
    if (popout) {
      this.patch(id, { popout });
      return;
    }
    if (!this.windows().some((w) => w.id === id)) return;
    this.windows.update((list) =>
      list.map((w) => {
        if (w.id !== id) return w;
        const next = { ...w };
        delete next.popout;
        return next;
      })
    );
    this.persist();
  }

  setOpacity(id: string, opacity: number) {
    this.patch(id, { opacity: clampOpacity(opacity) });
  }

  /** Viewport fractions for a pixel rectangle, kept inside the viewport. */
  rectFromPixels(r: PxRect): PipRect {
    const vp = this.viewport();
    return toFractions(clampToViewport(r, vp), vp);
  }

  updateViewport() {
    this.viewport.set(this.readViewport());
  }

  /** Fetch the installed webapps list for the launcher. */
  refreshWebapps() {
    this.signalk.apps.list().subscribe({
      next: (list) => this.webapps.set(mapWebappList(list as SKAppsList[])),
      error: () => this.app.debug('PiP App: could not fetch the webapps list')
    });
  }

  private patch(id: string, change: Partial<PipAppDef>) {
    if (!this.windows().some((w) => w.id === id)) return;
    this.windows.update((list) =>
      list.map((w) => (w.id === id ? { ...w, ...change } : w))
    );
    this.persist();
  }

  /**
   * Apply a freshly loaded config. Windows changed here since the last load
   * are newer than that copy (they were opened or moved while it was being
   * fetched), so they are kept and the stored windows added around them.
   */
  private onConfigReady() {
    if (!this.changedSinceLoad) {
      this.load();
      return;
    }
    const local = this.windows();
    const stored = normalisePipApps(this.app.config?.pipApps?.windows).filter(
      (w) => !local.some((l) => l.id === w.id || sameSource(l.source, w.source))
    );
    const merged = [...local, ...stored];
    this.windows.set(merged);
    this.zOrder.set([
      ...stored.map((w) => w.id),
      ...this.zOrder().filter((id) => local.some((l) => l.id === id))
    ]);
    this.persist();
    // What is shown now is what was just stored.
    this.changedSinceLoad = false;
  }

  private load() {
    const stored = normalisePipApps(this.app.config?.pipApps?.windows);
    this.windows.set(stored);
    this.zOrder.set(stored.map((w) => w.id));
    this.changedSinceLoad = false;
  }

  private persist(debounced = false) {
    this.changedSinceLoad = true;
    this.app.config.pipApps = { windows: this.windows() };
    if (debounced) {
      this.app.saveConfigDebounced();
    } else {
      this.app.saveConfig();
    }
  }

  private readViewport(): ViewportSize {
    return { w: window.innerWidth, h: window.innerHeight };
  }
}
