import { Injectable, computed, signal } from '@angular/core';
import type {
  OverlayFrameResult,
  OverlayInfo,
  OverlayRequestEvent
} from 'signalk-plotterext-bus/host';
import { OverlayBand, OverlayContribution } from './types';

/**
 * Host-side state for image map overlays (capability `overlays.image`): which
 * overlays exist, the user's show/fade choices, the active-overlay budget, the
 * latest frame request per overlay, and the rules for accepting a frame.
 *
 * A dependency-free root service (signals only), so the chart list can use it
 * without the extension host and it is unit-testable with `new`. The
 * PlotterExtensionService feeds it the manifest definitions and its
 * persistence hook.
 */

/** Most image overlays drawn at once; the rest are suspended (budget). */
export const MAX_ACTIVE_OVERLAYS = 4;

/** Least time between two accepted live (unrequested) frames of one overlay. */
export const LIVE_FRAME_MIN_INTERVAL_MS = 200;

/**
 * z-index range of each band in the map layer stack (fb-map.component.html).
 *
 * `aboveCharts`: above the charts (10+n) and weather/current layers (50-56),
 * below radar (99).
 *
 * `aboveResources`: Freeboard draws its routes (500+) and waypoints (600) above
 * its own alarm rings (anchor 300, CPA 350), own-vessel lines (330-350) and AIS
 * AtoN/base-station targets (200-220), so no z-index is both above the former
 * and below the latter. The spec's hard rule — never cover the vessel, alarm
 * indications or AIS targets — wins: the band sits above radar (99), tracks
 * (100-110) and resource sets (120+), below everything from AIS targets (200)
 * up.
 */
const BAND_Z: Record<OverlayBand, { base: number; span: number }> = {
  aboveCharts: { base: 60, span: 30 },
  aboveResources: { base: 190, span: 10 }
};

/** An overlay definition contributed by a compatible extension. */
export interface OverlayDefinition {
  extension: string;
  extensionName: string;
  def: OverlayContribution;
}

/** Everything the host needs about one overlay. */
export interface OverlayEntry {
  /** `<extension>/<overlay id>` — stable, also the persisted settings key. */
  key: string;
  extension: string;
  extensionName: string;
  id: string;
  title: string;
  runtime: string;
  band: OverlayBand;
  visible: boolean;
  opacity: number;
  suspended: boolean;
  zIndex: number;
  minZoom?: number;
  maxZoom?: number;
}

export type OverlaySettings = Record<
  string,
  { visible: boolean; opacity: number }
>;

/** What a frame needs to reach the map layer. */
export interface OverlayFrameDelivery {
  image: ImageBitmap;
  /** Render-space extent: the frame's extent shifted into the viewed world copy. */
  extent: [number, number, number, number];
}

/** A frame as the `overlay.frame` handler hands it over, already validated. */
export interface OverlayFrameInput {
  overlayId: string;
  requestId?: string;
  extent: [number, number, number, number];
  image: ImageBitmap;
}

interface PendingRequest {
  request: OverlayRequestEvent;
  /** Render-space shift of the world copy the request was made for. */
  worldOffset: number;
}

export class OverlayRefusal extends Error {
  constructor(
    readonly reason: 'overlays.unknownId' | 'overlays.badRequest',
    message: string
  ) {
    super(message);
  }
}

export const overlayKey = (extension: string, id: string) =>
  `${extension}/${id}`;

function clampOpacity(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(1, Math.max(0, v))
    : fallback;
}

@Injectable({ providedIn: 'root' })
export class OverlayRegistry {
  private readonly definitions = signal<OverlayDefinition[]>([]);
  private readonly settings = signal<OverlaySettings>({});
  private readonly latest = new Map<string, PendingRequest>();
  private readonly lastLive = new Map<string, number>();
  private readonly sinks = new Map<
    string,
    (frame: OverlayFrameDelivery) => void
  >();
  private requestSeq = 0;
  private persist: (settings: OverlaySettings) => void = () => undefined;
  /** Clock for the live-frame pace; replaceable in tests. */
  now: () => number = () => Date.now();

  /** Where the user's show/fade choices are saved. */
  setPersist(fn: (settings: OverlaySettings) => void) {
    this.persist = fn;
  }

  /**
   * Every overlay, in render order (bottom first): `aboveCharts` before
   * `aboveResources`, manifest order within a band. Overlays beyond the
   * active budget are suspended, counting only those the user has shown.
   */
  readonly entries = computed<OverlayEntry[]>(() => {
    const settings = this.settings();
    const byBand: Record<OverlayBand, OverlayEntry[]> = {
      aboveCharts: [],
      aboveResources: []
    };
    for (const { extension, extensionName, def } of this.definitions()) {
      const key = overlayKey(extension, def.id);
      const band: OverlayBand =
        def.band === 'aboveResources' ? 'aboveResources' : 'aboveCharts';
      const saved = settings[key];
      byBand[band].push({
        key,
        extension,
        extensionName,
        id: def.id,
        title: def.title,
        runtime: def.runtime,
        band,
        visible:
          typeof saved?.visible === 'boolean'
            ? saved.visible
            : def.visible !== false,
        opacity: clampOpacity(saved?.opacity, clampOpacity(def.opacity, 1)),
        suspended: false,
        zIndex: 0,
        minZoom: def.minZoom,
        maxZoom: def.maxZoom
      });
    }
    const ordered: OverlayEntry[] = [];
    let active = 0;
    for (const band of ['aboveCharts', 'aboveResources'] as OverlayBand[]) {
      byBand[band].forEach((e, i) => {
        e.zIndex = BAND_Z[band].base + Math.min(i, BAND_Z[band].span - 1);
        if (e.visible) {
          e.suspended = active >= MAX_ACTIVE_OVERLAYS;
          if (!e.suspended) active++;
        }
        ordered.push(e);
      });
    }
    return ordered;
  });

  /** Overlays to draw now: shown by the user and within the budget. */
  readonly active = computed(() =>
    this.entries().filter((e) => e.visible && !e.suspended)
  );

  setDefinitions(defs: OverlayDefinition[]) {
    this.definitions.set(defs);
    const keys = new Set(this.entries().map((e) => e.key));
    for (const key of [...this.latest.keys()]) {
      if (!keys.has(key)) this.latest.delete(key);
    }
  }

  loadSettings(settings: OverlaySettings | undefined) {
    this.settings.set({ ...(settings ?? {}) });
  }

  entry(key: string): OverlayEntry | undefined {
    return this.entries().find((e) => e.key === key);
  }

  /** The overlays an extension owns, as `overlay.list` reports them. */
  list(extension: string): OverlayInfo[] {
    return this.entries()
      .filter((e) => e.extension === extension)
      .map((e) => ({
        id: e.id,
        title: e.title,
        band: e.band,
        visible: e.visible,
        opacity: e.opacity,
        suspended: e.suspended
      }));
  }

  /** Throws `overlays.unknownId` unless every id is one of the extension's overlays. */
  requireOwn(extension: string, ids: string[]) {
    const own = new Set(
      this.entries()
        .filter((e) => e.extension === extension)
        .map((e) => e.id)
    );
    const unknown = ids.filter((id) => !own.has(id));
    if (unknown.length) {
      throw new OverlayRefusal(
        'overlays.unknownId',
        `Unknown overlay id(s): ${unknown.join(', ')}`
      );
    }
  }

  setVisibility(keys: string[], visible: boolean) {
    this.update(keys, (s) => ({ ...s, visible }));
  }

  /**
   * `save: false` previews the opacity (e.g. while a slider moves) without
   * persisting it; a later saved call, or `loadSettings`, settles it.
   */
  setOpacity(keys: string[], opacity: number, save = true) {
    this.update(
      keys,
      (s) => ({ ...s, opacity: clampOpacity(opacity, 1) }),
      save
    );
  }

  private update(
    keys: string[],
    fn: (s: { visible: boolean; opacity: number }) => {
      visible: boolean;
      opacity: number;
    },
    save = true
  ) {
    const next = { ...this.settings() };
    for (const key of keys) {
      const e = this.entry(key);
      if (!e) continue;
      next[key] = fn({ visible: e.visible, opacity: e.opacity });
    }
    this.settings.set(next);
    if (save) this.persist(next);
  }

  /**
   * Record a new frame request for `key` and return it (the event the
   * overlay's runtime receives). `view` is the request minus its ids;
   * `worldOffset` is the render-space shift of the viewed world copy, applied
   * to frames answering this request.
   */
  newRequest(
    key: string,
    view: Omit<OverlayRequestEvent, 'overlayId' | 'requestId'>,
    worldOffset: number
  ): OverlayRequestEvent | null {
    const e = this.entry(key);
    if (!e) return null;
    const request: OverlayRequestEvent = {
      overlayId: e.id,
      requestId: `r-${++this.requestSeq}`,
      ...view
    };
    this.latest.set(key, { request, worldOffset });
    return request;
  }

  /** The most recent request per overlay of a runtime — replayed when it subscribes. */
  latestRequestsFor(extension: string, runtime: string): OverlayRequestEvent[] {
    return this.active()
      .filter((e) => e.extension === extension && e.runtime === runtime)
      .map((e) => this.latest.get(e.key)?.request)
      .filter((r): r is OverlayRequestEvent => !!r);
  }

  /** Drop the pending request of an overlay no longer drawn. */
  clearRequest(key: string) {
    this.latest.delete(key);
    this.lastLive.delete(key);
  }

  registerSink(key: string, sink: (frame: OverlayFrameDelivery) => void) {
    this.sinks.set(key, sink);
    return () => {
      if (this.sinks.get(key) === sink) this.sinks.delete(key);
    };
  }

  /**
   * Accept or refuse a frame sent by `runtime` of `extension`. Throws
   * {@link OverlayRefusal} for an error; returns `{ accepted: false, reason }`
   * for a frame that is valid but not wanted. An accepted frame is handed to
   * the overlay's map layer; a refused one is closed here.
   */
  acceptFrame(
    extension: string,
    runtime: string | null,
    frame: OverlayFrameInput
  ): OverlayFrameResult {
    const key = overlayKey(extension, frame.overlayId);
    const e = this.entry(key);
    if (!e || runtime === null || e.runtime !== runtime) {
      frame.image.close();
      throw new OverlayRefusal(
        'overlays.unknownId',
        `No overlay "${frame.overlayId}" is drawn by this context`
      );
    }
    const pending = this.latest.get(key);
    const sink = this.sinks.get(key);
    if (!pending || !sink || !e.visible || e.suspended) {
      frame.image.close();
      return { accepted: false, reason: 'overlays.superseded' };
    }
    // A frame answering an older request (or a live frame drawn for one) is
    // superseded, whatever its size: the newer request may well differ in
    // size, so a size check first would turn a routine race into an error.
    const sizeMatches =
      frame.image.width === pending.request.width &&
      frame.image.height === pending.request.height;
    if (
      (frame.requestId !== undefined &&
        frame.requestId !== pending.request.requestId) ||
      (frame.requestId === undefined && !sizeMatches)
    ) {
      frame.image.close();
      return { accepted: false, reason: 'overlays.superseded' };
    }
    if (!sizeMatches) {
      frame.image.close();
      throw new OverlayRefusal(
        'overlays.badRequest',
        `Frame is ${frame.image.width}x${frame.image.height}, request was ` +
          `${pending.request.width}x${pending.request.height}`
      );
    }
    if (frame.requestId === undefined) {
      const t = this.now();
      const last = this.lastLive.get(key);
      if (last !== undefined && t - last < LIVE_FRAME_MIN_INTERVAL_MS) {
        frame.image.close();
        return { accepted: false, reason: 'overlays.throttled' };
      }
      this.lastLive.set(key, t);
    }
    const [x0, y0, x1, y1] = frame.extent;
    const dx = pending.worldOffset;
    sink({ image: frame.image, extent: [x0 + dx, y0, x1 + dx, y1] });
    return { accepted: true };
  }
}
