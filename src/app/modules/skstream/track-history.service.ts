import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { PalettePosition } from 'src/app/types';
import { TrackHistoryDialog } from 'src/app/lib/components/dialogs/track-history-dialog';
import { MapService } from 'src/app/modules/map/ol/lib/map.service';
import {
  bboxInView,
  clampPaletteOffset,
  fitBbox,
  HISTORY_ALL,
  HistoryBbox,
  HistoryPreset,
  HistoryRange,
  HistorySpan,
  HistoryTrack,
  historyContextsQuery,
  historyEpsilon,
  historyMetaQuery,
  historyQuery,
  parseHistoryContexts,
  parseHistorySpan,
  parseHistoryTrack,
  poseAt,
  presetRange,
  unionBboxes
} from './track-history';
import { Position } from 'src/app/types';

/** A shown vessel drawn where it was at the scrubbed time. */
export interface TrackHistoryGhost {
  context: string;
  position: Position;
  /** Radians clockwise from north. */
  heading: number;
  /** AIS ship type, for the vessel's icon; undefined for the own vessel. */
  typeId?: number;
}
import { needsAisRefetch, padExtent, viewportBbox } from './track-source';

/** Share of the viewport added on each side of the history box, so small pans
 * and a heading-up map's rotations don't refetch (see `needsAisRefetch`). */
const HISTORY_BBOX_PAD = 0.5;
/** Settle time before a moved view or range is fetched. */
const HISTORY_DEBOUNCE = 400;
/** How long the list of vessels with recorded history is reused. */
const RECORDED_TTL = 60000;

const PALETTE_WIDTH = 320;
const PALETTE_TOP = 70;
const PALETTE_HEADER = 40;
const PALETTE_RIGHT_MARGIN = 70;

/** Deepest zoom a fitted track is shown at: a vessel that never moved has a
 * box of one point, which would otherwise zoom as far in as the map goes. */
const FIT_MAX_ZOOM = 16;

/** The extent a span answer gives: `null` when nothing was recorded, and
 * undefined (unknown) when the provider sent no box. */
const extentOf = (span: HistorySpan | undefined) => (span ? span.bbox : null);

/** Browsing recorded track history (#821): the vessels whose whole recorded
 * track is shown, the time range it is shown for, and the tracks fetched for
 * the current map viewport from the v2 Track API. Session-only, like the
 * per-vessel TRACK toggle; v2 only (hidden without a Track API provider). */
@Injectable({ providedIn: 'root' })
export class TrackHistoryService {
  private app = inject(AppFacade);
  private signalk = inject(SignalKClient);
  private dialog = inject(MatDialog);
  private mapService = inject(MapService);

  /** Vessels whose history is shown: `self`, or an AIS vessel's context. */
  readonly shown = signal<string[]>([]);
  /** Time range shown, for every vessel alike. */
  readonly range = signal<HistoryRange>(HISTORY_ALL);
  /** The quick choice the range came from; null once the bar is dragged. */
  readonly preset = signal<HistoryPreset | null>('all');
  /** Fetched history for the current viewport, keyed as `shown`. */
  readonly tracks = signal<Map<string, HistoryTrack>>(new Map());
  /** Recorded span (and provider-recorded name) of each shown vessel. */
  readonly spans = signal<Map<string, HistorySpan>>(new Map());
  /** Where each shown vessel's track in the selected range lies, from the
   * whole range rather than the viewport; `null` when the range holds nothing
   * for it. A vessel is absent while unknown. */
  readonly extents = signal<Map<string, HistoryBbox | null>>(new Map());
  /** Requests in flight. */
  readonly pending = signal(0);
  /** Shown vessels whose latest history request failed: their earlier
   * geometry is dropped rather than left looking like the new range's. */
  readonly failed = signal<Set<string>>(new Set());
  /** Contexts with any recorded track; null until listed. */
  readonly recorded = signal<Set<string> | null>(null);
  /** The map viewport (lon/lat `[w, s, e, n]`), as of the last move-end. */
  readonly viewExtent = signal<number[] | null>(null);
  /** Shown vessels with track in the selected range that can't be seen:
   * none was drawn (it was all recorded outside the fetched area), or what
   * was drawn lies outside the view — history is fetched for a padded box,
   * so a passage can be drawn off-screen. */
  readonly offscreen = computed(() => {
    const tracks = this.tracks();
    const extents = this.extents();
    const failed = this.failed();
    const view = this.viewExtent();
    return this.shown().filter((c) => {
      const bbox = extents.get(c);
      return (
        !!bbox && !failed.has(c) && (!tracks.has(c) || !bboxInView(bbox, view))
      );
    });
  });
  /** A v2 Track API provider is available. */
  readonly available = computed(() => this.app.featureFlags().tracksApi);
  /** The time the history is scrubbed to; null is live (now), which shows no
   * ghost vessels. */
  readonly scrubTime = signal<number | null>(null);
  /** Where each shown vessel was at the scrubbed time, for drawing a ghost of
   * it there. A vessel with nothing recorded at that time has none. */
  readonly ghosts = computed<TrackHistoryGhost[]>(() => {
    const t = this.scrubTime();
    if (t === null) {
      return [];
    }
    const ghosts: TrackHistoryGhost[] = [];
    this.tracks().forEach((track, context) => {
      const pose = poseAt(track.lines, track.times, t);
      if (pose) {
        ghosts.push({
          context,
          ...pose,
          typeId:
            context === 'self'
              ? undefined
              : this.app.data.vessels.aisTargets.get(context)?.type?.id
        });
      }
    });
    return ghosts;
  });

  private view: { extent: number[]; zoom: number } | null = null;
  private fetched: { extent: number[]; zoom: number } | null = null;
  // latest request per vessel: an older answer never replaces a newer one
  private generation = new Map<string, number>();
  private seq = 0;
  // latest extent request per vessel, as `generation` is for tracks
  private extentGeneration = new Map<string, number>();
  // the range changed since the extents were last requested
  private extentsStale = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private recordedAt = 0;
  private paletteRef: MatDialogRef<TrackHistoryDialog> | undefined;
  // the provider history was fetched from; `null` when there is none
  private sourceKey: string | null | undefined;
  // bumped on every change of provider, so answers from the old one are dropped
  private sourceEpoch = 0;

  constructor() {
    // Losing the provider, or switching to another one, invalidates everything
    // fetched so far: the tracks, the spans, and which vessels have history.
    // A reconnect to the same provider changes nothing.
    effect(() => {
      const key = this.available() ? (this.provider() ?? '') : null;
      untracked(() => {
        if (key !== this.sourceKey) {
          this.sourceKey = key;
          this.sourceEpoch++;
          this.recorded.set(null);
          this.recordedAt = 0;
          this.clear();
        }
      });
    });
  }

  isShown(context: string): boolean {
    return this.shown().includes(context);
  }

  /** Whether a vessel has any recorded track: undefined while unknown. The own
   * vessel is asked for as `self` but listed under its own context. */
  hasHistory(context: string): boolean | undefined {
    const rec = this.recorded();
    if (!rec) {
      return undefined;
    }
    const id = context === 'self' ? this.app.data.vessels.self?.id : context;
    return id ? rec.has(id) : undefined;
  }

  /** Re-list the vessels with recorded history, unless listed recently. */
  refreshRecorded(force = false) {
    if (
      !this.available() ||
      (!force && Date.now() - this.recordedAt < RECORDED_TTL)
    ) {
      return;
    }
    this.recordedAt = Date.now();
    const epoch = this.sourceEpoch;
    this.get(
      `/tracks/contexts?${historyContextsQuery(this.provider())}`
    )?.subscribe({
      next: (r) => {
        if (epoch === this.sourceEpoch) {
          this.recorded.set(parseHistoryContexts(r));
        }
      },
      error: () => {
        if (epoch === this.sourceEpoch) {
          this.recordedAt = 0;
        }
      }
    });
  }

  /** Show or hide one vessel's history. */
  toggle(context: string) {
    if (this.isShown(context)) {
      this.remove(context);
    } else if (this.available()) {
      this.shown.update((s) => [...s, context]);
      this.fetchSpan(context);
      if (!this.rangeIsAll()) {
        this.fetchExtent(context);
      }
      this.fetchTrack(context);
      this.openPalette();
    }
  }

  remove(context: string) {
    this.shown.update((s) => s.filter((c) => c !== context));
    this.generation.delete(context);
    this.tracks.update((m) => {
      const n = new Map(m);
      n.delete(context);
      return n;
    });
    // its span no longer stretches the bar's axis
    this.spans.update((m) => {
      const n = new Map(m);
      n.delete(context);
      return n;
    });
    this.extentGeneration.delete(context);
    this.setExtent(context, undefined);
    this.setFailed(context, false);
    if (this.shown().length === 0) {
      this.clear();
    }
  }

  /** Hide all history and close the palette. */
  clear() {
    clearTimeout(this.timer);
    this.generation.clear();
    this.extentGeneration.clear();
    this.extentsStale = false;
    if (this.shown().length !== 0) {
      this.shown.set([]);
    }
    if (this.tracks().size !== 0) {
      this.tracks.set(new Map());
    }
    this.spans.set(new Map());
    this.extents.set(new Map());
    this.failed.set(new Set());
    this.range.set(HISTORY_ALL);
    this.preset.set('all');
    this.scrubTime.set(null);
    this.fetched = null;
    const ref = this.paletteRef;
    this.paletteRef = undefined;
    ref?.close();
  }

  setPreset(preset: HistoryPreset) {
    this.setRange(presetRange(preset, Date.now()), preset);
  }

  /** Change the range. The bar calls this on every step of a drag, so the
   * fetch waits for the handles to settle. */
  setRange(range: HistoryRange, preset: HistoryPreset | null = null) {
    this.range.set(range);
    this.preset.set(preset);
    this.extentsStale = true;
    this.schedule();
  }

  /** Scrub the history to a time; null returns it to live. */
  setScrub(t: number | null) {
    this.scrubTime.set(t);
  }

  /** The map viewport (lon/lat) and zoom, after every move-end. */
  setView(extent: number[], zoom: number) {
    this.view = { extent, zoom };
    this.viewExtent.set(extent);
    if (this.shown().length !== 0 && needsAisRefetch(this.fetched, this.view)) {
      this.schedule();
    }
  }

  /** Fit the map to where the given vessels' tracks in the selected range
   * lie. Never done unasked: it moves the chart, and turns off follow-vessel
   * (as every requested map move does). */
  zoomTo(contexts: string[]) {
    const extents = this.extents();
    const bbox = unionBboxes(
      contexts.map((c) => extents.get(c)).filter((b): b is HistoryBbox => !!b)
    );
    if (!bbox) {
      return;
    }
    const map = this.mapService.getMaps()[0];
    const size = map?.getSize();
    const limits = this.app.MAP_ZOOM_EXTENT;
    const fit = fitBbox(
      bbox,
      size && size[0] > 0 && size[1] > 0
        ? [size[0], size[1]]
        : [window.innerWidth, window.innerHeight],
      { min: limits.min, max: Math.min(limits.max, FIT_MAX_ZOOM) },
      map?.getView()?.getRotation() ?? 0
    );
    this.app.mapMoveRequest.set(fit);
  }

  /** A display name for a shown vessel. */
  label(context: string): string {
    if (context === 'self') {
      return this.app.data.vessels.self?.name || 'Own vessel';
    }
    const v = this.app.data.vessels.aisTargets.get(context);
    return (
      v?.name ||
      this.spans().get(context)?.name ||
      v?.mmsi ||
      context.split(':').pop()
    );
  }

  private provider(): string | undefined {
    return this.app.trackSource()?.provider;
  }

  private get(path: string) {
    return this.signalk.api.get(2, path);
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fetchAll(), HISTORY_DEBOUNCE);
  }

  private fetchAll() {
    const extents = this.extentsStale;
    this.extentsStale = false;
    this.shown().forEach((c) => {
      if (extents) {
        this.fetchExtent(c);
      }
      this.fetchTrack(c);
    });
  }

  private rangeIsAll(): boolean {
    const r = this.range();
    return r.from === null && r.to === null;
  }

  /** The padded viewport box to ask for, remembered as what was fetched. */
  private requestBox(): [number, number, number, number] | null {
    if (!this.view) {
      return null;
    }
    this.fetched = {
      extent: padExtent(this.view.extent, HISTORY_BBOX_PAD),
      zoom: this.view.zoom
    };
    return viewportBbox(this.fetched.extent);
  }

  private fetchTrack(context: string) {
    const provider = this.provider();
    const req = this.get(
      `/tracks?${historyQuery({
        context,
        bbox: this.requestBox(),
        epsilon: this.view
          ? historyEpsilon(this.view.zoom, this.view.extent)
          : null,
        range: this.range(),
        provider
      })}`
    );
    if (!req) {
      return;
    }
    const token = ++this.seq;
    this.generation.set(context, token);
    this.pending.update((n) => n + 1);
    req.subscribe({
      next: (fc) => {
        if (this.generation.get(context) !== token) {
          return;
        }
        this.setTrack(context, parseHistoryTrack(context, fc, provider));
        this.setFailed(context, false);
      },
      error: () => {
        this.pending.update((n) => n - 1);
        if (this.generation.get(context) !== token) {
          return;
        }
        // what is drawn is for the previous view or range: don't pass it off
        // as this one
        this.setTrack(context, undefined);
        this.setFailed(context, true);
        console.warn(`Track history: request for ${context} failed`);
      },
      complete: () => this.pending.update((n) => n - 1)
    });
  }

  private setTrack(context: string, track: HistoryTrack | undefined) {
    this.tracks.update((m) => {
      const n = new Map(m);
      if (track) {
        n.set(context, track);
      } else {
        n.delete(context);
      }
      return n;
    });
  }

  private setFailed(context: string, failed: boolean) {
    if (this.failed().has(context) !== failed) {
      this.failed.update((f) => {
        const n = new Set(f);
        if (failed) {
          n.add(context);
        } else {
          n.delete(context);
        }
        return n;
      });
    }
  }

  /** The whole record's span, for the bar's axis. With the whole record
   * selected it is also the extent of the range, so no second request. */
  private fetchSpan(context: string) {
    const epoch = this.sourceEpoch;
    const extentToken = this.rangeIsAll()
      ? this.claimExtent(context)
      : undefined;
    const req = this.get(
      `/tracks?${historyMetaQuery(context, this.provider())}`
    );
    if (!req) {
      return;
    }
    this.pending.update((n) => n + 1);
    req.subscribe({
      next: (fc) => {
        if (epoch !== this.sourceEpoch || !this.isShown(context)) {
          return;
        }
        const span = parseHistorySpan(fc, this.provider());
        if (span) {
          this.spans.update((m) => new Map(m).set(context, span));
        }
        if (
          extentToken !== undefined &&
          this.extentGeneration.get(context) === extentToken
        ) {
          this.setExtent(context, extentOf(span));
        }
      },
      error: () => {
        this.pending.update((n) => n - 1);
        console.warn(`Track history: span request for ${context} failed`);
      },
      complete: () => this.pending.update((n) => n - 1)
    });
  }

  /** Where the vessel's track in the selected range lies. */
  private fetchExtent(context: string) {
    const epoch = this.sourceEpoch;
    const token = this.claimExtent(context);
    // what is known is for the previous range
    this.setExtent(context, undefined);
    const req = this.get(
      `/tracks?${historyMetaQuery(context, this.provider(), this.range())}`
    );
    if (!req) {
      return;
    }
    this.pending.update((n) => n + 1);
    req.subscribe({
      next: (fc) => {
        if (
          epoch === this.sourceEpoch &&
          this.extentGeneration.get(context) === token
        ) {
          this.setExtent(
            context,
            extentOf(parseHistorySpan(fc, this.provider()))
          );
        }
      },
      error: () => {
        this.pending.update((n) => n - 1);
        console.warn(`Track history: extent request for ${context} failed`);
      },
      complete: () => this.pending.update((n) => n - 1)
    });
  }

  private claimExtent(context: string): number {
    const token = ++this.seq;
    this.extentGeneration.set(context, token);
    return token;
  }

  private setExtent(context: string, bbox: HistoryBbox | null | undefined) {
    if (bbox === undefined && !this.extents().has(context)) {
      return;
    }
    this.extents.update((m) => {
      const n = new Map(m);
      if (bbox === undefined) {
        n.delete(context);
      } else {
        n.set(context, bbox);
      }
      return n;
    });
  }

  private openPalette() {
    if (this.paletteRef) {
      return;
    }
    const left = Math.max(
      8,
      window.innerWidth - PALETTE_WIDTH - PALETTE_RIGHT_MARGIN
    );
    const ref = this.dialog.open(TrackHistoryDialog, {
      hasBackdrop: false,
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      width: `${PALETTE_WIDTH}px`,
      position: { top: `${PALETTE_TOP}px`, left: `${left}px` },
      data: {
        history: this,
        position: clampPaletteOffset(
          this.app.config.trackHistoryPalettePos,
          { left, top: PALETTE_TOP },
          { width: PALETTE_WIDTH, header: PALETTE_HEADER },
          { width: window.innerWidth, height: window.innerHeight }
        ),
        onMoved: (position: PalettePosition) => {
          this.app.config.trackHistoryPalettePos = position;
          this.app.saveConfig();
        }
      }
    });
    this.paletteRef = ref;
    ref.afterClosed().subscribe(() => {
      if (this.paletteRef === ref) {
        this.paletteRef = undefined;
        this.clear();
      }
    });
  }
}
