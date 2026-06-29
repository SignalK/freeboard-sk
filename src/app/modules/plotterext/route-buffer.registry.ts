import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { RoutePoint, RouteSummary } from 'signalk-plotterext-bus/host';

/**
 * A live, in-memory route edit buffer. Not necessarily persisted: a buffer is
 * a route the host is currently holding/rendering, addressed by a host-assigned
 * `routeId`, that may never be saved (persistence is opt-in elsewhere).
 */
export interface RouteBuffer {
  routeId: string;
  name: string | null;
  /** Route-level description (distinct from a waypoint's per-point description). */
  description: string | null;
  /** Monotonic revision; increments on every mutation. */
  rev: number;
  /** Whether the route is backed by a persisted routes resource. */
  saved: boolean;
  /** Whether the in-memory route has pending unsaved changes. */
  dirty: boolean;
  /** Backing routes-resource id when saved (the resource this route persists
   *  to). Undefined for a never-saved draft. */
  href?: string;
  points: RoutePoint[];
}

/**
 * A registry mutation, surfaced on `events$`. The host bridges these to the
 * `route.*` bus events of the plotter-extensions `routes` capability
 * (`visible`/`hidden`/`dirty`). Point mutations (`route.point.*`) extend this
 * union in a later slice; `dirty` is the conformance-floor catch-all. The
 * `route.saved` event is emitted by the host service (it owns the resource
 * `href`), not via this stream.
 */
export type RouteRegistryEvent =
  | {
      type: 'visible';
      routeId: string;
      rev: number;
      name: string | null;
      pointCount: number;
      saved: boolean;
      dirty: boolean;
    }
  | { type: 'hidden'; routeId: string; rev: number; saved: boolean }
  | { type: 'dirty'; routeId: string; rev: number; reason?: string };

/**
 * Holds the host's live route edit buffers. The single source of truth for
 * routes being built or edited via the `routes` capability: extensions CRUD
 * buffers through it, native draw/modify gestures feed it, and it renders them
 * on the chart. This service owns the data + the `rev` contract and emits
 * mutation events; wiring to the bus and the map layer lives elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class RouteBufferRegistry {
  private readonly buffers = new Map<string, RouteBuffer>();
  private readonly events = new Subject<RouteRegistryEvent>();

  /** Stream of buffer mutations (created / deleted / dirty). */
  readonly events$: Observable<RouteRegistryEvent> = this.events.asObservable();

  private readonly liveSignal = signal<RouteBuffer[]>([]);
  /** Reactive snapshot of all live buffers, for chart rendering. */
  readonly live = this.liveSignal.asReadonly();

  /** Create a new buffer, optionally seeded with a name and/or points. */
  create(
    opts: { name?: string; description?: string; points?: RoutePoint[] } = {}
  ): RouteBuffer {
    const routeId = this.newRouteId();
    const buffer: RouteBuffer = {
      routeId,
      name: opts.name ?? null,
      description: opts.description ?? null,
      rev: 1,
      saved: false,
      dirty: true,
      points: (opts.points ?? []).map((p) => this.clonePoint(p))
    };
    this.buffers.set(routeId, buffer);
    this.refreshLive();
    this.events.next({
      type: 'visible',
      routeId,
      rev: buffer.rev,
      name: buffer.name,
      pointCount: buffer.points.length,
      saved: buffer.saved,
      dirty: buffer.dirty
    });
    return this.snapshot(buffer);
  }

  /**
   * Bring a stored route into the visible set as an addressable, saved + clean
   * entry (or refresh an existing entry's geometry). `href` is the backing
   * routes-resource id. Emits `visible` (`saved:true, dirty:false`).
   */
  show(opts: {
    routeId: string;
    name?: string | null;
    description?: string | null;
    points?: RoutePoint[];
    href: string;
  }): RouteBuffer {
    const existing = this.buffers.get(opts.routeId);
    const buffer: RouteBuffer = {
      routeId: opts.routeId,
      name: opts.name ?? existing?.name ?? null,
      description: opts.description ?? existing?.description ?? null,
      rev: existing ? existing.rev + 1 : 1,
      saved: true,
      dirty: false,
      href: opts.href,
      // A metadata-only refresh (no points) must keep the existing geometry,
      // not blank it.
      points: (opts.points ?? existing?.points ?? []).map((p) =>
        this.clonePoint(p)
      )
    };
    this.buffers.set(opts.routeId, buffer);
    this.refreshLive();
    this.events.next({
      type: 'visible',
      routeId: buffer.routeId,
      rev: buffer.rev,
      name: buffer.name,
      pointCount: buffer.points.length,
      saved: true,
      dirty: false
    });
    return this.snapshot(buffer);
  }

  /** Snapshot of a buffer, or undefined if no buffer has that id. */
  get(routeId: string): RouteBuffer | undefined {
    const b = this.buffers.get(routeId);
    return b ? this.snapshot(b) : undefined;
  }

  /** Whether a buffer with the given id exists. */
  has(routeId: string): boolean {
    return this.buffers.has(routeId);
  }

  /** Whether any buffer is backed by the given resource id (href). Used to
   *  dedupe when mirroring the host's displayed routes into the visible set. */
  hasHref(href: string): boolean {
    return this.getByHref(href) !== undefined;
  }

  /** Snapshot of the buffer backed by the given resource id (href), if any.
   *  Resolves a draft-saved route by its backing resource even though it is
   *  still keyed under its original (draft) routeId. */
  getByHref(href: string): RouteBuffer | undefined {
    for (const b of this.buffers.values()) {
      if (b.href === href) {
        return this.snapshot(b);
      }
    }
    return undefined;
  }

  /** Non-reactive snapshot of every buffer (does not read the live() signal, so
   *  it is safe to call inside an effect that also mutates the registry). */
  all(): RouteBuffer[] {
    return [...this.buffers.values()].map((b) => this.snapshot(b));
  }

  /** Summaries of all live routes (the visible set). */
  list(): RouteSummary[] {
    return [...this.buffers.values()].map((b) => ({
      routeId: b.routeId,
      name: b.name,
      rev: b.rev,
      pointCount: b.points.length,
      saved: b.saved,
      dirty: b.dirty
    }));
  }

  /**
   * Remove a route from the visible set. Returns true if it existed. Emits
   * `hidden` carrying the route's `saved` flag: `saved:true` ⇒ a stored route
   * was made invisible (the resource is untouched); `saved:false` ⇒ a draft was
   * deleted.
   */
  delete(routeId: string, hiddenSaved?: boolean): boolean {
    const b = this.buffers.get(routeId);
    if (!b) {
      return false;
    }
    b.rev += 1;
    // The emitted `saved` reflects whether the route still exists on the server
    // afterwards: defaults to the buffer's flag (hide), but a permanent delete
    // passes false (gone) even for a route that was saved.
    const saved = hiddenSaved ?? b.saved;
    this.buffers.delete(routeId);
    this.refreshLive();
    this.events.next({ type: 'hidden', routeId, rev: b.rev, saved });
    return true;
  }

  /**
   * Mark a route persisted (`saved:true, dirty:false`) after a server write,
   * keeping it in the visible set under the same `routeId`. Returns the new
   * `rev`, or undefined if no route has that id. Does not emit — the host
   * service broadcasts `route.saved` (it owns the resource `href`).
   */
  markSaved(
    routeId: string,
    href?: string,
    name?: string | null,
    description?: string | null
  ): number | undefined {
    const b = this.buffers.get(routeId);
    if (!b) {
      return undefined;
    }
    // A draft only becomes "saved" once it has a backing resource id — that id
    // is what hasHref()/the selection-mirror rely on.
    if (!b.saved && href === undefined) {
      throw new Error('markSaved requires an href when saving a draft route');
    }
    b.rev += 1;
    b.saved = true;
    b.dirty = false;
    if (href !== undefined) {
      b.href = href;
    }
    if (name !== undefined) {
      b.name = name;
    }
    if (description !== undefined) {
      b.description = description;
    }
    this.refreshLive();
    return b.rev;
  }

  /**
   * Replace all points of a buffer (bulk set). Returns the updated snapshot, or
   * undefined if no buffer has that id. Emits a `dirty` event (reason
   * `replaced`) — the auto-router's primary write path.
   */
  replace(routeId: string, points: RoutePoint[]): RouteBuffer | undefined {
    const b = this.buffers.get(routeId);
    if (!b) {
      return undefined;
    }
    b.points = (points ?? []).map((p) => this.clonePoint(p));
    b.rev += 1;
    b.dirty = true;
    this.refreshLive();
    this.events.next({
      type: 'dirty',
      routeId,
      rev: b.rev,
      reason: 'replaced'
    });
    return this.snapshot(b);
  }

  private refreshLive(): void {
    this.liveSignal.set(
      [...this.buffers.values()].map((b) => this.snapshot(b))
    );
  }

  /**
   * Re-emit the live() signal without changing any buffer. Used to force a
   * chart re-render — e.g. to restore a draft's geometry after the user
   * cancels an in-place edit (the map feature was moved by the Modify
   * interaction but the registry was never updated).
   */
  refresh(): void {
    this.refreshLive();
  }

  private newRouteId(): string {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c?.randomUUID) {
      return c.randomUUID();
    }
    // Fallback for environments without WebCrypto randomUUID.
    return (
      'rb-' +
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2, 10)
    );
  }

  private clonePoint(p: RoutePoint): RoutePoint {
    return {
      position: [...p.position] as RoutePoint['position'],
      ...(p.name !== undefined ? { name: p.name } : {}),
      ...(p.description !== undefined ? { description: p.description } : {})
    };
  }

  /** Defensive copy so callers cannot mutate registry internals. */
  private snapshot(b: RouteBuffer): RouteBuffer {
    return {
      routeId: b.routeId,
      name: b.name,
      description: b.description,
      rev: b.rev,
      saved: b.saved,
      dirty: b.dirty,
      ...(b.href !== undefined ? { href: b.href } : {}),
      points: b.points.map((p) => this.clonePoint(p))
    };
  }
}
