// Plotter extension host service.
//
// Responsibilities (phase 1-2 of the plotterExtensions host implementation —
// the widget stack):
//   - discover extension manifests from /signalk/v2/api/resources/plotterExtensions
//   - widget placement persisted in app config (anchor areas, gravity packing)
//   - one HostConnection (signalk-plotterext-bus) per live iframe context
//   - host API methods: state.get/set, signalk.subscribe/unsubscribe/put,
//     ui.openPanel/togglePanel, ui.openConfigPanel/toggleConfigPanel,
//     ui.closePanel
//   - a single multiplexed delta WebSocket relaying subscribed Signal K paths
//     to widget contexts as sk.<path> events
//
// There is deliberately NO host-side enable/disable for extensions: the user
// already controls extension availability on the Signal K server (plugin
// install + plugin enable). Presence in the plotterExtensions resource
// collection is the enablement signal.
//
// Map/resource host APIs (buttons, filters, map.*) belong to phase 3.

import {
  Injectable,
  computed,
  effect,
  isDevMode,
  signal
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import { transformExtent } from 'ol/proj';
import * as uuid from 'uuid';

import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from 'src/app/modules/skresources/resources.service';
import { MapService } from 'src/app/modules/map/ol/lib/map.service';
import { FBNotes, LineString, Position } from 'src/app/types';
import {
  HostConnection,
  MethodHandler,
  RoutePoint,
  RpcError,
  RPC_ERRORS,
  windowPort
} from 'signalk-plotterext-bus/host';
import {
  ANCHOR_COL_ORDER,
  ANCHOR_GRAVITY,
  ANCHOR_GRID,
  AnchorId,
  BackgroundContribution,
  ButtonContribution,
  HOST_API_VERSION,
  HOST_CAPABILITIES,
  PanelContribution,
  PlacedWidget,
  PlotterExtensionManifest,
  ResourceFilterCondition,
  ResourceFilterSpec,
  WIDGET_CELL_GAP,
  WidgetCandidate,
  WidgetContribution,
  cellHeightPx,
  parseSize
} from './types';
import { RouteBufferRegistry } from './route-buffer.registry';
import { createRouteMethods } from './route-methods';

const STATE_STORAGE_KEY = 'fb-plotterext-state';
const SK_PATH_PERIOD = 1000; // default delta period (ms) for relayed paths

// Recognised resources.setFilter condition operators (see ResourceFilterCondition).
const FILTER_OPS = new Set([
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'in',
  'contains',
  'regex',
  'exists'
]);

// A match condition is only safe to store/evaluate if it has a string path and
// a known operator; evalCondition() does `cond.path.split('.')`, so a malformed
// entry (e.g. {}) would throw during change detection.
const isValidFilterCondition = (c: unknown): boolean =>
  !!c &&
  typeof c === 'object' &&
  typeof (c as { path?: unknown }).path === 'string' &&
  (c as { path: string }).path.length > 0 &&
  FILTER_OPS.has((c as { op?: unknown }).op as string);

interface ExtensionStateStore {
  [extensionId: string]: {
    extension?: Record<string, unknown>;
    instances?: { [instanceId: string]: Record<string, unknown> };
  };
}

interface LiveContext {
  extension: string;
  conn: HostConnection;
  /** signalk.subscribe subscriptionId -> paths */
  skSubs: Map<string, string[]>;
  skSubSeq: number;
}

@Injectable({ providedIn: 'root' })
export class PlotterExtensionService {
  // id -> manifest, as discovered from the resources API
  readonly manifests = signal<Record<string, PlotterExtensionManifest>>({});
  // placements whose extension is present and compatible (drives the overlay)
  readonly activeWidgets = signal<PlacedWidget[]>([]);
  readonly initialized = signal(false);

  // Bumped on window resize so the size-derived offset computeds below — which
  // call cellHeightPx() (reads window.innerWidth) — re-evaluate after an
  // orientation/viewport change, not only when widget state changes.
  private readonly viewportTick = signal(0);

  /**
   * Bottom offset (px) for host chrome that normally lives in the
   * bottom-right corner (Freeboard's action button): 0 when no widgets
   * occupy the bottom-right anchor, otherwise just above the occupied rows.
   */
  readonly actionButtonLift = computed(() => {
    this.viewportTick();
    const br = this.activeWidgets().filter((p) => p.anchor === 'br');
    if (!br.length) return 0;
    const rows = br.some((p) => p.row === 0) ? 2 : 1;
    return rows * cellHeightPx() + (rows - 1) * WIDGET_CELL_GAP + 6;
  });

  /**
   * Bottom offset (px) for the Lat/Lon status bar: 0 when no widget occupies
   * the bottom-center anchor (the bar keeps its default resting position),
   * otherwise just above the bottom-center widget stack (which sits flush
   * against the screen bottom). Mirrors actionButtonLift for the bottom-right.
   */
  readonly statusBarLift = computed(() => {
    this.viewportTick();
    const cb = this.activeWidgets().filter((p) => p.anchor === 'cb');
    if (!cb.length) return 0;
    const rows = cb.some((p) => p.row === 0) ? 2 : 1;
    return rows * cellHeightPx() + (rows - 1) * WIDGET_CELL_GAP + 4;
  });

  /**
   * Top offset (px) for the right-hand toolbar (the Show/Hide Toolbars button
   * and the expanded toolbar below it): 0 when no widget occupies the
   * top-right anchor (the toolbar keeps its normal position), otherwise just
   * below the top-right widget stack (which sits flush against the screen
   * top). The top-right anchor has top gravity, so the non-gravity row is
   * row 1. Mirrors actionButtonLift/statusBarLift.
   */
  readonly toolbarTopOffset = computed(() => {
    this.viewportTick();
    const tr = this.activeWidgets().filter((p) => p.anchor === 'tr');
    if (!tr.length) return 0;
    const rows = tr.some((p) => p.row === 1) ? 2 : 1;
    return rows * cellHeightPx() + (rows - 1) * WIDGET_CELL_GAP + 4;
  });

  /** Toolbar buttons contributed by compatible extensions. */
  readonly toolbarButtons = computed(() => {
    const result: Array<{
      extension: string;
      extensionName: string;
      button: ButtonContribution;
    }> = [];
    for (const [extension, manifest] of Object.entries(this.manifests())) {
      if (!this.isCompatible(manifest)) continue;
      for (const button of manifest.buttons ?? []) {
        if (
          button.apiVersion !== undefined &&
          button.apiVersion !== HOST_API_VERSION
        ) {
          continue;
        }
        result.push({ extension, extensionName: manifest.name, button });
      }
    }
    return result;
  });

  /**
   * Headless background runtimes contributed by compatible extensions. Drives
   * the always-mounted runtime host: a hidden iframe per entry, loaded while
   * the extension is present in the collection and torn down when it leaves
   * (the providing plugin was disabled). `key` is stable per (extension,
   * runtime) so Angular's @for keeps the iframe across unrelated changes.
   */
  readonly backgroundRuntimes = computed(() => {
    const result: Array<{
      key: string;
      extension: string;
      extensionName: string;
      runtime: BackgroundContribution;
    }> = [];
    for (const [extension, manifest] of Object.entries(this.manifests())) {
      if (!this.isCompatible(manifest)) continue;
      for (const runtime of manifest.background ?? []) {
        if (
          runtime.apiVersion !== undefined &&
          runtime.apiVersion !== HOST_API_VERSION
        ) {
          continue;
        }
        if (runtime.type !== 'iframe' || !runtime.url) continue;
        result.push({
          key: `${extension}/${runtime.id}`,
          extension,
          extensionName: manifest.name,
          runtime
        });
      }
    }
    return result;
  });

  // ---------- extension panels (button-opened, ui.openPanel) ----------

  /**
   * Open panels live in a right-side drawer. keepAlive panels stay loaded
   * (hidden) when closed; onOpen panels are destroyed. One panel is visible
   * at a time.
   */
  readonly openPanels = signal<
    Array<{
      key: string;
      extension: string;
      panel: PanelContribution;
      visible: boolean;
    }>
  >([]);

  readonly visiblePanel = computed(
    () => this.openPanels().find((p) => p.visible) ?? null
  );

  openPanel(extension: string, panelId: string): boolean {
    const manifest = this.manifests()[extension];
    const panel = manifest?.panels?.find((p) => p.id === panelId);
    if (!panel || panel.type !== 'iframe' || !panel.url) return false;
    // Skip a contribution that targets a newer host API than we implement.
    if (
      panel.apiVersion !== undefined &&
      panel.apiVersion !== HOST_API_VERSION
    ) {
      return false;
    }
    const key = `${extension}/${panelId}`;
    this.openPanels.update((panels) => {
      // Keep the target plus any keepAlive panels; drop non-keepAlive panels
      // that are being hidden so their iframe/timers/subscriptions are torn
      // down (matches the documented panel lifecycle).
      const retained = panels
        .filter((p) => p.key === key || p.panel.lifecycle === 'keepAlive')
        .map((p) => ({ ...p, visible: p.key === key }));
      if (retained.some((p) => p.key === key)) {
        return retained;
      }
      return [...retained, { key, extension, panel, visible: true }];
    });
    return true;
  }

  /** Close the visible drawer panel (hide keepAlive, destroy others). */
  closeVisiblePanel() {
    const visible = this.openPanels().find((p) => p.visible);
    if (visible) this.closePanel(visible.key);
  }

  /**
   * Close a specific drawer panel by key (hide if keepAlive, destroy
   * otherwise). Used by `ui.closePanel` so a panel — including a hidden
   * keepAlive one — closes itself rather than whichever panel is visible.
   */
  closePanel(key: string) {
    this.openPanels.update((panels) => {
      const target = panels.find((p) => p.key === key);
      if (!target) return panels;
      if (target.panel.lifecycle === 'keepAlive') {
        return panels.map((p) =>
          p.key === key ? { ...p, visible: false } : p
        );
      }
      return panels.filter((p) => p.key !== key);
    });
  }

  /**
   * Toggle a drawer panel: if it is the currently visible panel, close it;
   * otherwise open (or switch to) it. Mirrors Freeboard's instrument-panel
   * button behavior.
   */
  togglePanel(extension: string, panelId: string): boolean {
    const key = `${extension}/${panelId}`;
    if (this.visiblePanel()?.key === key) {
      this.closeVisiblePanel();
      return true;
    }
    return this.openPanel(extension, panelId);
  }

  /** `ui.openPanel` / `ui.togglePanel` for an extension context. */
  private uiPanelMethods(extension: string): Record<string, MethodHandler> {
    const requirePanel = (params: unknown): string => {
      const panel = (params as { panel?: string } | undefined)?.panel;
      if (!panel) {
        throw new RpcError('panel is required', {
          code: RPC_ERRORS.INVALID_PARAMS,
          reason: 'UNKNOWN_PANEL'
        });
      }
      return panel;
    };
    return {
      'ui.openPanel': async (params) => {
        const panel = requirePanel(params);
        if (!this.openPanel(extension, panel)) {
          throw new RpcError(`No such panel: ${panel}`, {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'UNKNOWN_PANEL'
          });
        }
        return {};
      },
      'ui.togglePanel': async (params) => {
        const panel = requirePanel(params);
        if (!this.togglePanel(extension, panel)) {
          throw new RpcError(`No such panel: ${panel}`, {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'UNKNOWN_PANEL'
          });
        }
        return {};
      }
    };
  }

  handleButtonAction(extension: string, button: ButtonContribution) {
    const action = button.action;
    if (!action) return;
    if (action.type === 'sendMessage') {
      // Fire-and-forget: publish a custom event onto the bus. Delivery is
      // subscription-gated (publish() only reaches contexts that subscribed
      // to the topic), so this reaches the extension's own background runtime
      // and, by convention with a shared topic, other extensions too.
      if (action.topic) this.broadcastMessage(action.topic, action.params);
      return;
    }
    const panel = action.panel;
    if (!panel) return;
    if (action.type === 'togglePanel') {
      this.togglePanel(extension, panel);
    } else if (action.type === 'openPanel') {
      this.openPanel(extension, panel);
    }
  }

  // ---------- resource display filters ----------

  /** type -> extension id -> filter */
  readonly resourceFilters = signal<
    Record<string, Record<string, ResourceFilterSpec>>
  >({});

  /** Notes to display: the resource cache with active filters applied. */
  readonly visibleNotes = computed<FBNotes>(() => {
    const notes = this.skres.notes();
    const filters = this.resourceFilters()['notes'];
    if (!filters || !Object.keys(filters).length) return notes;
    const specs = Object.values(filters);
    return notes.filter(([id, note]) =>
      specs.every((spec) => this.passesFilter(spec, id, note))
    );
  });

  /** Active-filter chips for the host UI. */
  readonly filterChips = computed(() => {
    const chips: Array<{
      type: string;
      extension: string;
      label: string;
    }> = [];
    for (const [type, byExt] of Object.entries(this.resourceFilters())) {
      for (const [extension, spec] of Object.entries(byExt)) {
        chips.push({
          type,
          extension,
          label:
            spec.label ??
            `${this.manifests()[extension]?.name ?? extension} filter`
        });
      }
    }
    return chips;
  });

  setResourceFilter(
    extension: string,
    type: string,
    filter: ResourceFilterSpec
  ) {
    this.resourceFilters.update((all) => ({
      ...all,
      [type]: { ...(all[type] ?? {}), [extension]: filter }
    }));
    this.publishToExtension(extension, 'filters.changed', {
      type,
      active: true
    });
  }

  clearResourceFilter(extension: string, type: string) {
    this.resourceFilters.update((all) => {
      const byExt = { ...(all[type] ?? {}) };
      delete byExt[extension];
      const next = { ...all };
      if (Object.keys(byExt).length) {
        next[type] = byExt;
      } else {
        delete next[type];
      }
      return next;
    });
    this.publishToExtension(extension, 'filters.changed', {
      type,
      active: false
    });
  }

  private passesFilter(
    spec: ResourceFilterSpec,
    id: string,
    resource: unknown
  ): boolean {
    let matches = true;
    if (spec.ids) {
      matches = spec.ids.includes(id);
    }
    if (matches && spec.match) {
      matches = spec.match.every((cond) => this.evalCondition(cond, resource));
    }
    return spec.mode === 'exclude' ? !matches : matches;
  }

  private evalCondition(
    cond: ResourceFilterCondition,
    resource: unknown
  ): boolean {
    let value: unknown = resource;
    for (const seg of cond.path.split('.')) {
      if (value === null || typeof value !== 'object') {
        value = undefined;
        break;
      }
      value = (value as Record<string, unknown>)[seg];
    }
    switch (cond.op) {
      case 'exists':
        return value !== undefined;
      case 'eq':
        return this.refEquals(value, cond.value, cond.exact);
      case 'ne':
        return !this.refEquals(value, cond.value, cond.exact);
      case 'lt':
        return typeof value === 'number' && value < (cond.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (cond.value as number);
      case 'gt':
        return typeof value === 'number' && value > (cond.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (cond.value as number);
      case 'in':
        return (
          Array.isArray(cond.value) &&
          cond.value.some((v) => this.refEquals(value, v, cond.exact))
        );
      case 'contains':
        if (typeof value === 'string') {
          return value.toLowerCase().includes(String(cond.value).toLowerCase());
        }
        return Array.isArray(value) && value.includes(cond.value);
      case 'regex': {
        if (typeof value !== 'string' || typeof cond.value !== 'string') {
          return false;
        }
        // Bound tested input length as a second ReDoS safeguard (resource
        // fields are short; anything larger is not worth matching here).
        if (value.length > 2000) return false;
        const re = this.compileRegex(cond.value);
        return re ? re.test(value) : false;
      }
      default:
        return false;
    }
  }

  /**
   * Local id of a symbol-style `namespace:id` reference, or null when the
   * value is not one. The grammar follows the Symbols API alias form: a
   * single colon, `namespace` matching `[A-Za-z0-9_-]+`, and an `id` with no
   * further colon. Multi-colon strings (e.g. `urn:mrn:...`) are NOT symbol
   * references and return null, so URN-like fields keep exact-match semantics.
   */
  private symbolLocalId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const m = /^[A-Za-z0-9_-]+:([^:]+)$/.exec(value);
    return m ? m[1] : null;
  }

  /**
   * Equality used by eq/ne/in. Exact match first; then namespace-tolerant
   * matching for symbol references so a filter written against a bare symbol
   * id (`anchorage`) still matches once the host has persisted a
   * fully-qualified alias (`default:anchorage`), and vice versa. Differing
   * namespaces (`custom:x` vs `fsk:x`) never match. Only single-colon
   * `namespace:id` values participate; everything else compares strictly.
   * `exact` opts out of the tolerance and compares strictly.
   */
  private refEquals(
    stored: unknown,
    target: unknown,
    exact?: boolean
  ): boolean {
    if (stored === target) return true;
    if (exact) return false;
    // bare target id vs qualified stored reference
    if (typeof target === 'string' && !target.includes(':')) {
      if (this.symbolLocalId(stored) === target) return true;
    }
    // qualified target reference vs bare stored id
    if (typeof stored === 'string' && !stored.includes(':')) {
      if (this.symbolLocalId(target) === stored) return true;
    }
    return false;
  }

  /**
   * Compile a filter regex; invalid or oversized patterns make the condition
   * false. Patterns come from extension filter specs and run synchronously in
   * the visibleNotes computed during change detection, so the length bound
   * limits ReDoS exposure (paired with an input-length bound at the call site).
   */
  private compileRegex(pattern: string): RegExp | null {
    if (pattern.length > 200) return null;
    try {
      return new RegExp(pattern);
    } catch {
      return null;
    }
  }

  private contexts = new Set<LiveContext>();

  // ---- Signal K delta relay (one WS for all widget contexts) ----
  private ws: WebSocket | null = null;
  private wsReady = false;
  private pathRefs = new Map<string, number>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private app: AppFacade,
    private signalk: SignalKClient,
    private dialog: MatDialog,
    private skres: SKResourceService,
    private mapService: MapService,
    private routeRegistry: RouteBufferRegistry
  ) {
    if (isDevMode()) {
      // console handle for exercising the host API during development
      (window as unknown as Record<string, unknown>)['fbPlotterExt'] = this;
    }
    // Recompute size-derived widget offsets on viewport/orientation changes.
    // The service is an app-lifetime root singleton, so this listener lives for
    // the session by design.
    window.addEventListener('resize', () =>
      this.viewportTick.update((n) => n + 1)
    );
    this.bridgeRouteEvents();
    // Mirror Freeboard's displayed (selected) routes into the visible-route
    // registry so the `routes` capability reflects them — including routes
    // restored from a previous session's selection state on load. Reads
    // skres.routes() so it re-runs whenever the displayed set changes.
    effect(() => this.syncVisibleFromSelections());
  }

  /**
   * Bring the registry in line with the host's displayed saved routes: show any
   * that are displayed but not yet mirrored (emits `route.visible saved:true`),
   * and hide mirrors of routes no longer displayed that have no pending edits
   * (emits `route.hidden saved:true`). Drafts and dirty edits are left alone.
   */
  /** Build RoutePoints from a route's geometry + coordinatesMeta, carrying each
   *  point's name AND description so they survive a round-trip through the
   *  registry and back into coordinatesMeta on save. */
  private pointsFromRoute(
    coords: Position[],
    meta?: Array<{ name?: string; description?: string }>
  ): RoutePoint[] {
    return coords.map((position, i) => ({
      position,
      ...(meta?.[i]?.name ? { name: meta[i].name } : {}),
      ...(meta?.[i]?.description ? { description: meta[i].description } : {})
    }));
  }

  /** Deep-compare two point lists (position + name + description) so a
   *  same-length geometry/metadata edit is still detected as a change. */
  private pointsEqual(a: RoutePoint[], b: RoutePoint[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((p, i) => {
      const q = b[i];
      return (
        p.position[0] === q.position[0] &&
        p.position[1] === q.position[1] &&
        (p.name ?? null) === (q.name ?? null) &&
        (p.description ?? null) === (q.description ?? null)
      );
    });
  }

  private syncVisibleFromSelections(): void {
    const displayed = this.skres.routes();
    const displayedHrefs = new Set(displayed.map((r) => r[0]));
    for (const [id, route] of displayed) {
      const coords = (route.feature?.geometry?.coordinates ?? []) as Position[];
      const meta = route.feature?.properties?.coordinatesMeta as
        | Array<{ name?: string; description?: string }>
        | undefined;
      const points = this.pointsFromRoute(coords, meta);
      // Resolve by href, not routeId: a draft saved via route.save keeps its
      // original (draft) routeId while its href points at the new resource, so
      // get(id) can be undefined while a buffer for this resource exists.
      const mirror = this.routeRegistry.getByHref(id);
      if (mirror) {
        // Refresh our own clean mirror when the backing route changed
        // server-side; never clobber a draft or a buffer with pending edits.
        const stale =
          mirror.saved &&
          !mirror.dirty &&
          ((mirror.name ?? null) !== (route.name ?? null) ||
            (mirror.description ?? null) !== (route.description ?? null) ||
            !this.pointsEqual(mirror.points, points));
        if (stale) {
          this.routeRegistry.show({
            routeId: mirror.routeId,
            name: route.name ?? null,
            description: route.description ?? null,
            points,
            href: id
          });
        }
        continue;
      }
      this.routeRegistry.show({
        routeId: id,
        name: route.name ?? null,
        description: route.description ?? null,
        points,
        href: id
      });
    }
    for (const buf of this.routeRegistry.all()) {
      if (buf.saved && !buf.dirty && buf.href && !displayedHrefs.has(buf.href)) {
        this.routeRegistry.delete(buf.routeId, true);
      }
    }
  }

  /**
   * Bridge RouteBufferRegistry mutations to `route.*` bus events. Delivery is
   * subscription-gated by broadcastMessage, so only contexts that subscribed
   * to (e.g.) `route.**` receive them. The service is an app-lifetime singleton,
   * so this subscription lives for the session by design.
   */
  private bridgeRouteEvents(): void {
    this.routeRegistry.events$.subscribe((e) => {
      switch (e.type) {
        case 'visible':
          this.broadcastMessage('route.visible', {
            routeId: e.routeId,
            rev: e.rev,
            name: e.name,
            pointCount: e.pointCount,
            saved: e.saved,
            dirty: e.dirty
          });
          break;
        case 'hidden':
          this.broadcastMessage('route.hidden', {
            routeId: e.routeId,
            rev: e.rev,
            saved: e.saved
          });
          break;
        case 'dirty':
          this.broadcastMessage('route.dirty', {
            routeId: e.routeId,
            rev: e.rev,
            ...(e.reason !== undefined ? { reason: e.reason } : {})
          });
          break;
      }
    });
  }

  /** Host API handlers for the `routes` capability. */
  private routeMethods(): Record<string, MethodHandler> {
    return createRouteMethods(this.routeRegistry, {
      onSave: (routeId, params) => this.saveBuffer(routeId, params),
      onShow: (ref) => this.showRoute(ref),
      onHide: (routeId) => this.hideRoute(routeId),
      onDelete: (routeId) => this.deleteRoute(routeId)
    });
  }

  /**
   * `route.hide`: remove a route from the map. A saved route's visibility is
   * unchecked (the stored resource is untouched → `route.hidden saved:true`); an
   * unsaved draft is discarded (`route.hidden saved:false`).
   */
  hideRoute(routeId: string): void {
    const buf = this.routeRegistry.get(routeId);
    if (!buf) {
      return;
    }
    if (buf.saved && buf.href) {
      this.skres.selectionRemove('routes', buf.href);
      this.skres.refreshRoutes();
      this.routeRegistry.delete(routeId, true);
    } else {
      this.routeRegistry.delete(routeId, false);
    }
  }

  /**
   * `route.delete`: permanently delete a saved route from the store (and discard
   * an unsaved one — same effect as hide). The route leaves the visible set as
   * `route.hidden saved:false` (gone) in both cases.
   */
  async deleteRoute(routeId: string): Promise<void> {
    const buf = this.routeRegistry.get(routeId);
    if (!buf) {
      return;
    }
    if (buf.saved && buf.href) {
      // Delete the resource directly (no confirm dialog — the extension already
      // chose to delete) and await it; keep the route on failure so host state
      // matches the server.
      try {
        await this.skres.deleteFromServer('routes', buf.href);
      } catch (err) {
        this.app.parseHttpErrorResponse(err);
        return;
      }
    }
    this.routeRegistry.delete(routeId, false);
  }

  /**
   * Bring a stored route into the visible set (capability `route.show`): ensure
   * it is displayed, load its geometry, and register it as an addressable
   * saved + clean route under its resource id. Throws `routes.badRef` if no such
   * route exists.
   */
  async showRoute(ref: string): Promise<{ routeId: string; rev: number }> {
    // Already mirrored (a displayed route, or shown before)? Return the existing
    // buffer rather than creating a duplicate for the same resource.
    const existing = this.routeRegistry.getByHref(ref);
    if (existing) {
      return { routeId: existing.routeId, rev: existing.rev };
    }
    this.skres.selectionAdd('routes', ref);
    await this.skres.refreshRoutes();
    const cached = this.skres.fromCache('routes', ref);
    if (!cached) {
      // Undo the speculative selection so an unknown ref doesn't linger in config.
      this.skres.selectionRemove('routes', ref);
      throw new RpcError('No such route', { reason: 'routes.badRef' });
    }
    const route = cached[1];
    const coords = (route.feature?.geometry?.coordinates ?? []) as Position[];
    const meta = route.feature?.properties?.coordinatesMeta as
      | Array<{ name?: string; description?: string }>
      | undefined;
    const points = this.pointsFromRoute(coords, meta);
    const buf = this.routeRegistry.show({
      routeId: ref,
      name: route.name ?? null,
      description: route.description ?? null,
      points,
      href: ref
    });
    return { routeId: buf.routeId, rev: buf.rev };
  }

  /**
   * Mirror a native edit of a stored route through the registry so extensions
   * observe it, then persist. The route becomes addressable (`route.visible` if
   * newly mirrored, else `route.dirty`) and is then saved (`route.saved`). The
   * geometry is persisted via the existing resource path, preserving per-point
   * metadata. Called by the host's own Modify-route flow.
   */
  async saveNativeRouteEdit(
    routeId: string,
    coords: Position[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coordsMetadata?: Array<any>
  ): Promise<void> {
    const points = this.pointsFromRoute(coords, coordsMetadata);
    let buf = this.routeRegistry.get(routeId);
    if (!buf) {
      const cached = this.skres.fromCache('routes', routeId);
      const name = cached ? (cached[1].name ?? null) : null;
      const description = cached ? (cached[1].description ?? null) : null;
      buf = this.routeRegistry.show({
        routeId,
        name,
        description,
        points,
        href: routeId
      });
    } else {
      this.routeRegistry.replace(routeId, points);
      buf = this.routeRegistry.get(routeId);
    }
    const href = buf?.href ?? routeId;
    // Await persistence — only mark saved + broadcast route.saved if the PUT
    // succeeded; otherwise the buffer stays dirty.
    const ok = await this.skres.updateRouteCoords(href, coords, coordsMetadata);
    if (!ok) {
      return;
    }
    const rev = this.routeRegistry.markSaved(routeId, href) ?? 0;
    this.broadcastMessage('route.saved', {
      routeId,
      rev,
      href,
      name: buf?.name ?? null,
      saved: true,
      dirty: false
    });
  }

  /**
   * Persist a live route to the `routes` resource, emit `route.saved`, and keep
   * it in the visible set under the same `routeId` (now `saved:true,
   * dirty:false`) — saving does not consume the route. Resolves with
   * `{ href, rev }` on save, or null if the user cancelled. Shared by the
   * `route.save` host method and the FSK info-panel "Save" action so both behave
   * identically. Pass `dialog:true` to prompt for the name/description.
   */
  async saveBuffer(
    routeId: string,
    opts: { name?: string; description?: string; dialog?: boolean } = {}
  ): Promise<{ href: string; rev: number } | null> {
    const buf = this.routeRegistry.get(routeId);
    if (!buf) {
      return null;
    }
    const [, route] = this.skres.buildRoute(
      buf.points.map((p) => p.position) as LineString
    );
    // buildRoute keeps only positions — carry the per-point names/descriptions
    // and the route-level description so they are not silently dropped on save.
    const coordinatesMeta = buf.points.map((p) => ({
      ...(p.name ? { name: p.name } : {}),
      ...(p.description ? { description: p.description } : {})
    }));
    if (coordinatesMeta.some((m) => Object.keys(m).length > 0)) {
      route.feature.properties.coordinatesMeta = coordinatesMeta;
    }
    route.name = opts.name ?? buf.name ?? '';
    route.description = opts.description ?? buf.description ?? '';
    let savedId: string | null;
    if (buf.href) {
      // Backed by an existing resource — update it in place (keep its id).
      try {
        await this.skres.putToServer('routes', buf.href, route);
        savedId = buf.href;
      } catch (err) {
        this.app.parseHttpErrorResponse(err);
        // A server rejection is a real failure, not a user cancel — surface it
        // so route.save reports routes.saveFailed instead of routes.saveCancelled.
        throw new RpcError('Failed to save route', {
          reason: 'routes.saveFailed'
        });
      }
    } else if (opts.dialog) {
      // Interactive: open the Route Details dialog (prefilled) so the user
      // names it. Returns null if they cancel.
      savedId = await this.skres.saveNewRoute(route);
    } else {
      // Headless create: persist directly with the supplied (or buffer) name.
      try {
        const rte = await this.skres.postToServer('routes', route);
        savedId = rte.id;
        // The dialog path (saveNewRoute) selects the new route; do the same for
        // the headless path so it stays displayed after a refresh.
        this.skres.selectionAdd('routes', savedId);
      } catch (err) {
        this.app.parseHttpErrorResponse(err);
        throw new RpcError('Failed to save route', {
          reason: 'routes.saveFailed'
        });
      }
    }
    if (!savedId) {
      // Only the interactive dialog path returns null — the user cancelled.
      return null;
    }
    // Keep the route in the visible set under the same routeId, now saved+clean,
    // recording the backing resource id + the (possibly dialog-set) name.
    const savedName = route.name || null;
    const rev =
      this.routeRegistry.markSaved(
        routeId,
        savedId,
        savedName,
        route.description || null
      ) ?? buf.rev + 1;
    this.broadcastMessage('route.saved', {
      routeId,
      rev,
      href: savedId,
      name: savedName,
      saved: true,
      dirty: false
    });
    // The route is persisted and no longer being edited — clear the editing
    // marker so the route-list visibility checkboxes are not left disabled.
    this.app.data.editingId = '';
    return { href: savedId, rev };
  }

  /** Fetch manifests. Called after the server connection is established. */
  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.signalk.api.get(
          this.app.skApiVersion,
          '/resources/plotterExtensions'
        )
      );
      const manifests: Record<string, PlotterExtensionManifest> = {};
      if (response && typeof response === 'object') {
        for (const [id, value] of Object.entries(
          response as Record<string, unknown>
        )) {
          if (this.isManifest(value)) {
            manifests[id] = value as PlotterExtensionManifest;
          }
        }
      }
      this.manifests.set(manifests);
    } catch {
      // No provider installed (404) or fetch failed: extensions unavailable.
      this.manifests.set({});
    }
    this.refreshActiveWidgets();
    this.initialized.set(true);
  }

  // ---------- discovery ----------

  private isCompatible(manifest: PlotterExtensionManifest): boolean {
    if (manifest.apiVersion !== HOST_API_VERSION) return false;
    return (manifest.requires ?? []).every((cap) =>
      HOST_CAPABILITIES.includes(cap)
    );
  }

  private isManifest(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as PlotterExtensionManifest).name === 'string' &&
      typeof (value as PlotterExtensionManifest).apiVersion === 'string'
    );
  }

  // ---------- widget placement ----------

  widgetDef(extension: string, widget: string): WidgetContribution | null {
    const manifest = this.manifests()[extension];
    return manifest?.widgets?.find((w) => w.id === widget) ?? null;
  }

  placements(): PlacedWidget[] {
    return this.app.config.plotterExtensions.widgets;
  }

  /** Occupancy map of an anchor area (sized per ANCHOR_GRID): occupied[row][col]. */
  private occupancy(anchor: AnchorId): boolean[][] {
    const { cols, rows } = ANCHOR_GRID[anchor];
    const occupied = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    );
    for (const placed of this.placements()) {
      if (placed.anchor !== anchor) continue;
      const def = this.widgetDef(placed.extension, placed.widget);
      const size = parseSize(def?.size ?? '1x1');
      for (let r = placed.row; r < placed.row + size.rows && r < rows; r++) {
        for (let c = placed.col; c < placed.col + size.cols && c < cols; c++) {
          occupied[r][c] = true;
        }
      }
    }
    return occupied;
  }

  /** Whether a cell of an anchor area is occupied by a placed widget. */
  cellOccupied(anchor: AnchorId, cell: { col: number; row: number }): boolean {
    return this.occupancy(anchor)[cell.row]?.[cell.col] ?? true;
  }

  /**
   * A placement is valid when every needed cell is free and the widget does
   * not "float": widgets pack from the anchor's screen edge inward, so a
   * widget not touching the gravity row needs the cells between it and the
   * gravity edge occupied.
   */
  private isValidOrigin(
    anchor: AnchorId,
    size: { cols: number; rows: number },
    origin: { col: number; row: number },
    occupied: boolean[][]
  ): boolean {
    const { cols, rows } = ANCHOR_GRID[anchor];
    if (origin.col + size.cols > cols || origin.row + size.rows > rows) {
      return false;
    }
    for (let r = origin.row; r < origin.row + size.rows; r++) {
      for (let c = origin.col; c < origin.col + size.cols; c++) {
        if (occupied[r][c]) return false;
      }
    }
    if (size.rows === 1) {
      const gravityRow = ANCHOR_GRAVITY[anchor] === 'bottom' ? rows - 1 : 0;
      if (origin.row !== gravityRow) {
        // floating row: require support toward the gravity edge
        for (let c = origin.col; c < origin.col + size.cols; c++) {
          if (!occupied[gravityRow][c]) return false;
        }
      }
    }
    return true;
  }

  /** Candidate origins for an anchor, most-preferred (gravity/corner) first. */
  private originOrder(anchor: AnchorId): Array<{ col: number; row: number }> {
    const rowCount = ANCHOR_GRID[anchor].rows;
    const ascending = Array.from({ length: rowCount }, (_, i) => i);
    const rows =
      ANCHOR_GRAVITY[anchor] === 'bottom'
        ? [...ascending].reverse()
        : ascending;
    const cols = ANCHOR_COL_ORDER[anchor];
    const order: Array<{ col: number; row: number }> = [];
    for (const row of rows) {
      for (const col of cols) {
        order.push({ col, row });
      }
    }
    return order;
  }

  /**
   * Best valid origin for a widget at an anchor. When a pressed cell is
   * given, only placements covering that cell are considered, so the user's
   * press location disambiguates (e.g. stacking on top of an existing
   * widget vs. filling the rest of the gravity row).
   */
  private findOrigin(
    anchor: AnchorId,
    widget: WidgetContribution,
    pressedCell?: { col: number; row: number }
  ): { col: number; row: number } | null {
    const size = parseSize(widget.size);
    const occupied = this.occupancy(anchor);
    for (const origin of this.originOrder(anchor)) {
      if (!this.isValidOrigin(anchor, size, origin, occupied)) continue;
      if (
        pressedCell &&
        !(
          pressedCell.col >= origin.col &&
          pressedCell.col < origin.col + size.cols &&
          pressedCell.row >= origin.row &&
          pressedCell.row < origin.row + size.rows
        )
      ) {
        continue;
      }
      return origin;
    }
    return null;
  }

  /**
   * All widgets (across compatible extensions) that could be added at the
   * pressed cell of an anchor area, each with its computed origin.
   */
  addableWidgets(
    anchor: AnchorId,
    pressedCell: { col: number; row: number }
  ): WidgetCandidate[] {
    const result: WidgetCandidate[] = [];
    for (const [extension, manifest] of Object.entries(this.manifests())) {
      if (!this.isCompatible(manifest)) continue;
      for (const widget of manifest.widgets ?? []) {
        if (widget.type !== 'iframe') continue;
        if (
          widget.apiVersion !== undefined &&
          widget.apiVersion !== HOST_API_VERSION
        ) {
          continue;
        }
        const origin = this.findOrigin(anchor, widget, pressedCell);
        if (origin) {
          result.push({
            extension,
            extensionName: manifest.name,
            widget,
            origin
          });
        }
      }
    }
    return result;
  }

  // Screen-coordinate hit testing is owned by the overlay (it has the anchor
  // DOM). The overlay registers its tester here so other entry points — the
  // desktop right-click menu — can resolve a point to an anchor cell without a
  // direct component reference.
  private hitTester:
    | ((
        x: number,
        y: number
      ) => { anchor: AnchorId; cell: { col: number; row: number } } | null)
    | null = null;

  registerHitTester(
    fn: (
      x: number,
      y: number
    ) => { anchor: AnchorId; cell: { col: number; row: number } } | null
  ): () => void {
    this.hitTester = fn;
    return () => {
      if (this.hitTester === fn) this.hitTester = null;
    };
  }

  /**
   * Resolve screen coordinates to an EMPTY anchor cell that can accept at least
   * one widget, or null. Used to gate and trigger the right-click "Add widget
   * here" menu item.
   */
  addableCellAt(
    x: number,
    y: number
  ): { anchor: AnchorId; cell: { col: number; row: number } } | null {
    const hit = this.hitTester?.(x, y);
    if (!hit) return null;
    if (this.cellOccupied(hit.anchor, hit.cell)) return null;
    if (!this.addableWidgets(hit.anchor, hit.cell).length) return null;
    return hit;
  }

  /**
   * Open the Add Widget picker for an empty anchor cell. Shared by the
   * press-and-hold gesture (touch) and the right-click menu (desktop); on a
   * choice it places the widget and opens its config panel if it has one.
   */
  async openAddWidgetPicker(
    anchor: AnchorId,
    cell: { col: number; row: number }
  ) {
    const candidates = this.addableWidgets(anchor, cell);
    if (!candidates.length) return;
    const { PlotterAddWidgetDialog } =
      await import('./add-widget-dialog.component');
    this.dialog
      .open(PlotterAddWidgetDialog, {
        data: { anchor, candidates },
        width: '340px'
      })
      .afterClosed()
      .subscribe((choice) => {
        if (!choice) return;
        const placed = this.placeWidget(
          choice.extension,
          choice.widget,
          anchor,
          choice.origin
        );
        if (this.widgetHasConfigPanel(placed)) {
          this.openConfigPanel(placed);
        }
      });
  }

  /** Place a widget at a previously computed origin (see addableWidgets). */
  placeWidget(
    extension: string,
    widget: WidgetContribution,
    anchor: AnchorId,
    origin: { col: number; row: number }
  ): PlacedWidget {
    const placed: PlacedWidget = {
      // uuid.v4() (not crypto.randomUUID) so placement works on plain-HTTP
      // origins too — crypto.randomUUID is secure-context only (boat LANs
      // are often http://<ip>).
      instanceId: uuid.v4(),
      extension,
      widget: widget.id,
      anchor,
      col: origin.col,
      row: origin.row
    };
    this.app.config.plotterExtensions.widgets.push(placed);
    this.app.saveConfig();
    this.refreshActiveWidgets();
    return placed;
  }

  removeWidget(instanceId: string) {
    const widgets = this.app.config.plotterExtensions.widgets;
    const idx = widgets.findIndex((w) => w.instanceId === instanceId);
    if (idx !== -1) {
      const [removed] = widgets.splice(idx, 1);
      this.clearInstanceState(removed.extension, instanceId);
      this.app.saveConfig();
      this.refreshActiveWidgets();
    }
  }

  private refreshActiveWidgets() {
    const manifests = this.manifests();
    this.activeWidgets.set(
      this.placements().filter((p) => {
        const manifest = manifests[p.extension];
        return (
          manifest &&
          this.isCompatible(manifest) &&
          manifest.widgets?.some(
            (w) =>
              w.id === p.widget &&
              (w.apiVersion === undefined || w.apiVersion === HOST_API_VERSION)
          )
        );
      })
    );
  }

  // ---------- live contexts (one per iframe) ----------

  /**
   * Manifest asset URLs are server-relative; resolve them against the
   * Signal K server origin (which differs from the app origin when running
   * the Angular dev server).
   */
  resolveAssetUrl(url: string): string {
    const base = this.app.hostDef?.url || window.location.origin;
    try {
      const baseUrl = new URL(base);
      const resolved = new URL(url, base);
      // The result feeds bypassSecurityTrustResourceUrl() in the iframe hosts,
      // so only trust http(s) assets — reject javascript:, data:, blob:, etc.
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        return 'about:blank';
      }
      // Manifest assets are server-relative; reject anything that resolves to a
      // different origin so a manifest cannot point the host (and its trusted
      // RPC surface) at an external server.
      if (resolved.origin !== baseUrl.origin) {
        return 'about:blank';
      }
      return resolved.toString();
    } catch {
      return 'about:blank';
    }
  }

  private assetOrigin(url: string): string {
    try {
      return new URL(this.resolveAssetUrl(url)).origin;
    } catch {
      return '*';
    }
  }

  /**
   * Attach a widget iframe to the host. Returns a detach function.
   * Call once the iframe element exists (the connection handles the
   * extension's bus.ready retries, so load-order does not matter).
   */
  attachWidget(iframe: HTMLIFrameElement, placed: PlacedWidget): () => void {
    const ctx: LiveContext = {
      extension: placed.extension,
      conn: null as unknown as HostConnection,
      skSubs: new Map(),
      skSubSeq: 0
    };
    const widgetUrl =
      this.widgetDef(placed.extension, placed.widget)?.url ?? '';
    ctx.conn = new HostConnection({
      port: windowPort(iframe.contentWindow as Window, {
        origin: this.assetOrigin(widgetUrl)
      }),
      hostInfo: this.hostInfo(),
      context: {
        kind: 'widget',
        id: placed.widget,
        instanceId: placed.instanceId,
        targetInstance: null
      },
      methods: {
        ...this.stateMethods(placed.extension, placed.instanceId),
        ...this.signalkMethods(ctx),
        ...this.unitsMethods(),
        ...this.resourcesMethods(placed.extension),
        ...this.mapMethods(),
        ...this.routeMethods(),
        ...this.uiPanelMethods(placed.extension),
        'ui.openConfigPanel': async () => {
          this.openConfigPanel(placed);
          return {};
        },
        'ui.toggleConfigPanel': async () => {
          this.toggleConfigPanel(placed);
          return {};
        }
      },
      onError: (err) => console.warn('plotterext widget error', err)
    });
    this.contexts.add(ctx);
    return () => this.detach(ctx);
  }

  /**
   * Attach a panel iframe (e.g. a widget configuration panel). targetInstance
   * scopes the panel's instance state to the widget being configured.
   */
  attachPanel(
    iframe: HTMLIFrameElement,
    opts: {
      extension: string;
      panel: PanelContribution;
      targetInstance?: string | null;
      targetWidget?: string | null;
      close: () => void;
    }
  ): () => void {
    const ctx: LiveContext = {
      extension: opts.extension,
      conn: null as unknown as HostConnection,
      skSubs: new Map(),
      skSubSeq: 0
    };
    ctx.conn = new HostConnection({
      port: windowPort(iframe.contentWindow as Window, {
        origin: this.assetOrigin(opts.panel.url ?? '')
      }),
      hostInfo: this.hostInfo(),
      context: {
        kind: 'panel',
        id: opts.panel.id,
        instanceId: null,
        targetInstance: opts.targetInstance ?? null,
        targetWidget: opts.targetWidget ?? null
      },
      methods: {
        ...this.stateMethods(opts.extension, opts.targetInstance ?? null),
        ...this.signalkMethods(ctx),
        ...this.unitsMethods(),
        ...this.resourcesMethods(opts.extension),
        ...this.mapMethods(),
        ...this.routeMethods(),
        ...this.uiPanelMethods(opts.extension),
        'ui.closePanel': async () => {
          opts.close();
          return {};
        }
      },
      onError: (err) => console.warn('plotterext panel error', err)
    });
    this.contexts.add(ctx);
    return () => this.detach(ctx);
  }

  /**
   * Attach a headless background-runtime iframe. No UI: same host API surface
   * as a panel minus the panel/config-only methods (no ui.closePanel /
   * ui.*ConfigPanel). State defaults to the extension scope (no instance).
   * Returns a detach function called when the runtime leaves the collection.
   */
  attachBackground(
    iframe: HTMLIFrameElement,
    opts: { extension: string; runtime: BackgroundContribution }
  ): () => void {
    const ctx: LiveContext = {
      extension: opts.extension,
      conn: null as unknown as HostConnection,
      skSubs: new Map(),
      skSubSeq: 0
    };
    ctx.conn = new HostConnection({
      port: windowPort(iframe.contentWindow as Window, {
        origin: this.assetOrigin(opts.runtime.url)
      }),
      hostInfo: this.hostInfo(),
      context: {
        kind: 'background',
        id: opts.runtime.id,
        instanceId: null
      },
      methods: {
        ...this.stateMethods(opts.extension, null),
        ...this.signalkMethods(ctx),
        ...this.unitsMethods(),
        ...this.resourcesMethods(opts.extension),
        ...this.mapMethods(),
        ...this.routeMethods(),
        ...this.uiPanelMethods(opts.extension)
      },
      onError: (err) => console.warn('plotterext background error', err)
    });
    this.contexts.add(ctx);
    return () => this.detach(ctx);
  }

  private detach(ctx: LiveContext) {
    if (!this.contexts.has(ctx)) return;
    this.contexts.delete(ctx);
    for (const [, paths] of ctx.skSubs) {
      this.releasePaths(paths);
    }
    ctx.skSubs.clear();
    ctx.conn.close();
  }

  private hostInfo() {
    return {
      host: 'freeboard-sk',
      hostVersion: this.app.data?.server?.version ?? 'dev',
      apiVersion: HOST_API_VERSION,
      capabilities: HOST_CAPABILITIES
    };
  }

  // ---------- configuration panels ----------

  // the currently open widget-configuration dialog, if any
  private configDialogRef: MatDialogRef<unknown> | null = null;
  private configDialogInstance: string | null = null;

  /** Whether a placed widget has a usable iframe configuration panel. */
  widgetHasConfigPanel(placed: PlacedWidget): boolean {
    const manifest = this.manifests()[placed.extension];
    const widget = this.widgetDef(placed.extension, placed.widget);
    const found = manifest?.panels?.find((p) => p.id === widget?.configPanel);
    return !!(found && found.type === 'iframe' && found.url);
  }

  openConfigPanel(placed: PlacedWidget) {
    const manifest = this.manifests()[placed.extension];
    const widget = this.widgetDef(placed.extension, placed.widget);
    const found = manifest?.panels?.find((p) => p.id === widget?.configPanel);
    // A widget with no usable config panel still gets a dialog so it can be
    // removed (long-press affordance applies to every placed widget). A panel
    // targeting a newer host API is treated as absent so it is not loaded.
    const panel =
      found &&
      found.type === 'iframe' &&
      found.url &&
      (found.apiVersion === undefined || found.apiVersion === HOST_API_VERSION)
        ? found
        : null;
    // Deferred import avoids a service->component->service import cycle.
    import('./panel-dialog.component').then(({ PlotterPanelDialog }) => {
      const ref = this.dialog.open(PlotterPanelDialog, {
        data: {
          extension: placed.extension,
          panel,
          title: widget?.title ?? placed.widget,
          targetInstance: placed.instanceId,
          targetWidget: placed.widget
        },
        width: '440px',
        maxHeight: '85vh'
      });
      this.configDialogRef = ref;
      this.configDialogInstance = placed.instanceId;
      ref.afterClosed().subscribe(() => {
        if (this.configDialogRef === ref) {
          this.configDialogRef = null;
          this.configDialogInstance = null;
        }
      });
    });
  }

  /**
   * Toggle a widget instance's configuration panel: close it if it is already
   * open for that instance, otherwise open it.
   */
  toggleConfigPanel(placed: PlacedWidget) {
    if (
      this.configDialogRef &&
      this.configDialogInstance === placed.instanceId
    ) {
      this.configDialogRef.close();
      return;
    }
    this.openConfigPanel(placed);
  }

  // ---------- state storage ----------
  //
  // v0 persistence is browser localStorage. TODO(phase 2 follow-up): persist
  // through the server's applicationData so widget config follows the user
  // across devices, mirroring how Freeboard persists its own config.

  private loadStore(): ExtensionStateStore {
    try {
      return JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  private saveStore(store: ExtensionStateStore) {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(store));
  }

  private clearInstanceState(extension: string, instanceId: string) {
    const store = this.loadStore();
    if (store[extension]?.instances?.[instanceId]) {
      delete store[extension].instances![instanceId];
      this.saveStore(store);
    }
  }

  private stateMethods(
    extension: string,
    instanceId: string | null
  ): Record<string, MethodHandler> {
    const resolve = (
      store: ExtensionStateStore,
      scope: string | undefined
    ): Record<string, unknown> => {
      const extStore = (store[extension] = store[extension] ?? {});
      const useInstance =
        (scope ?? (instanceId ? 'instance' : 'extension')) === 'instance';
      if (useInstance) {
        if (!instanceId) {
          throw new RpcError('No widget instance in scope', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'NO_INSTANCE'
          });
        }
        extStore.instances = extStore.instances ?? {};
        return (extStore.instances[instanceId] =
          extStore.instances[instanceId] ?? {});
      }
      return (extStore.extension = extStore.extension ?? {});
    };

    return {
      'state.get': async (params) => {
        const { scope, keys } = (params ?? {}) as {
          scope?: string;
          keys?: string[];
        };
        const values = resolve(this.loadStore(), scope);
        if (!keys) return { values };
        const filtered: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in values) filtered[key] = values[key];
        }
        return { values: filtered };
      },
      'state.set': async (params) => {
        const { scope, values } = (params ?? {}) as {
          scope?: string;
          values?: Record<string, unknown>;
        };
        if (!values || typeof values !== 'object') {
          throw new RpcError('state.set requires a values object', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'INVALID_VALUES'
          });
        }
        const store = this.loadStore();
        const target = resolve(store, scope);
        Object.assign(target, values);
        this.saveStore(store);
        const useInstance =
          (scope ?? (instanceId ? 'instance' : 'extension')) === 'instance';
        this.publishToExtension(extension, 'state.changed', {
          scope: useInstance ? 'instance' : 'extension',
          instanceId: useInstance ? instanceId : null,
          keys: Object.keys(values)
        });
        return {};
      }
    };
  }

  private publishToExtension(
    extension: string,
    event: string,
    params: unknown
  ) {
    for (const ctx of this.contexts) {
      if (ctx.extension === extension) {
        ctx.conn.publish(event, params);
      }
    }
  }

  /**
   * Broadcast a custom event to every live extension context (any extension).
   * Like publishToExtension, delivery is subscription-gated — publish() only
   * reaches a context that subscribed to the topic — so this is a shared,
   * opt-in message bus, not a spam channel. Used by `sendMessage` buttons; the
   * cross-extension reach is what lets a federation of plugins talk over
   * namespaced topics.
   */
  private broadcastMessage(event: string, params: unknown) {
    for (const ctx of this.contexts) {
      ctx.conn.publish(event, params);
    }
  }

  // ---------- resources host API ----------

  private resourcesMethods(extension: string): Record<string, MethodHandler> {
    return {
      'resources.list': async (params) => {
        const { type, query } = (params ?? {}) as {
          type?: string;
          query?: Record<string, unknown>;
        };
        if (
          typeof type !== 'string' ||
          !/^[A-Za-z][A-Za-z0-9_-]*$/.test(type)
        ) {
          throw new RpcError('resources.list requires a resource type', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'INVALID_TYPE'
          });
        }
        const qs = this.serializeQuery(query);
        try {
          const result = await firstValueFrom(
            this.signalk.api.get(
              this.app.skApiVersion,
              `/resources/${type}${qs}`
            )
          );
          return result ?? {};
        } catch (err) {
          throw new RpcError(`resources.list ${type} failed`, {
            reason: 'LIST_FAILED',
            data: { message: (err as Error)?.message }
          });
        }
      },
      'resources.setFilter': async (params) => {
        const { type, filter } = (params ?? {}) as {
          type?: string;
          filter?: ResourceFilterSpec;
        };
        if (
          typeof type !== 'string' ||
          !filter ||
          (filter.mode !== 'include' && filter.mode !== 'exclude') ||
          (filter.ids === undefined && filter.match === undefined) ||
          (filter.ids !== undefined &&
            (!Array.isArray(filter.ids) ||
              !filter.ids.every((id) => typeof id === 'string'))) ||
          (filter.match !== undefined &&
            (!Array.isArray(filter.match) ||
              !filter.match.every(isValidFilterCondition)))
        ) {
          throw new RpcError(
            'resources.setFilter requires a type and a filter with mode plus ids and/or match',
            { code: RPC_ERRORS.INVALID_PARAMS, reason: 'INVALID_FILTER' }
          );
        }
        this.setResourceFilter(extension, type, filter);
        return {};
      },
      'resources.clearFilter': async (params) => {
        const { type } = (params ?? {}) as { type?: string };
        if (typeof type !== 'string') {
          throw new RpcError('resources.clearFilter requires a type', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'INVALID_TYPE'
          });
        }
        this.clearResourceFilter(extension, type);
        return {};
      }
    };
  }

  private serializeQuery(query?: Record<string, unknown>): string {
    if (!query || typeof query !== 'object') return '';
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      const serialized = Array.isArray(value)
        ? JSON.stringify(value)
        : String(value);
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}`
      );
    }
    return parts.length ? `?${parts.join('&')}` : '';
  }

  // ---------- map host API ----------
  //
  // Map moves are routed through the host's own centering path
  // (AppFacade.mapMoveRequest -> AppComponent effect -> centerAndZoom), not
  // by reaching into the OpenLayers view directly. Driving the OL view
  // directly bypasses Freeboard's mapCenter/mapZoom signal flow, so chart
  // and resource layers do not refresh after the move.

  private mapMethods(): Record<string, MethodHandler> {
    return {
      'map.getView': async () => {
        return {
          center: this.app.config.map.center,
          zoom: this.app.config.map.zoomLevel,
          bounds: this.app.mapExtent()
        };
      },
      'map.center': async (params) => {
        const { position, zoom } = (params ?? {}) as {
          position?: [number, number];
          zoom?: number;
        };
        if (
          !Array.isArray(position) ||
          position.length !== 2 ||
          !position.every((v) => typeof v === 'number')
        ) {
          throw new RpcError('map.center requires position [lon, lat]', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'INVALID_POSITION'
          });
        }
        this.app.mapMoveRequest.set({
          center: position as [number, number],
          ...(typeof zoom === 'number' ? { zoom } : {})
        });
        return {};
      },
      'map.fitBounds': async (params) => {
        const { bounds } = (params ?? {}) as { bounds?: number[] };
        if (
          !Array.isArray(bounds) ||
          bounds.length !== 4 ||
          !bounds.every((v) => typeof v === 'number')
        ) {
          throw new RpcError(
            'map.fitBounds requires bounds [minLon, minLat, maxLon, maxLat]',
            { code: RPC_ERRORS.INVALID_PARAMS, reason: 'INVALID_BOUNDS' }
          );
        }
        const [minLon, minLat, maxLon, maxLat] = bounds as number[];
        const center: [number, number] = [
          (minLon + maxLon) / 2,
          (minLat + maxLat) / 2
        ];
        this.app.mapMoveRequest.set({
          center,
          zoom: this.zoomForBounds(bounds as number[])
        });
        return {};
      }
    };
  }

  /**
   * Compute a zoom level that frames a lon/lat bounding box in the current
   * viewport (read-only use of the OL view). Falls back to a reasonable
   * zoom when the map is unavailable.
   */
  private zoomForBounds(bounds: number[]): number {
    const map = this.mapService.getMaps()[0];
    const size = map?.getSize();
    if (!map || !size) return 12;
    const view = map.getView();
    const ext = transformExtent(bounds, 'EPSG:4326', 'EPSG:3857');
    // pad by shrinking the usable size ~15% so markers aren't at the edge
    const padded: [number, number] = [size[0] * 0.85, size[1] * 0.85];
    const resolution = view.getResolutionForExtent(ext, padded);
    const zoom = view.getZoomForResolution(resolution) ?? 12;
    const maxZoom = this.app.MAP_ZOOM_EXTENT?.max ?? 18;
    return Math.min(zoom, maxZoom);
  }

  /**
   * Pulse OL map.updateSize() across a layout transition (the panel drawer
   * push), so the map tracks the changing container width smoothly.
   */
  pulseMapResize(durationMs = 320) {
    let elapsed = 0;
    const step = () => {
      this.mapService.updateSize();
      elapsed += 16;
      if (elapsed < durationMs) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- unit preferences ----------

  /**
   * Host API method exposing the user's preferred display units (Freeboard's
   * Settings -> Units tab) so extensions can pick sensible conversions.
   * Vocabulary follows Freeboard's settings values:
   *   speed: 'kn' | 'm/s' | 'km/h' | 'mph'
   *   distance: 'kilometer' | 'naut-mile'
   *   depth / length: 'm' | 'foot'
   *   temperature: 'C' | 'F'
   */
  private unitsMethods(): Record<string, MethodHandler> {
    return {
      'units.get': async () => {
        const u = this.app.config.units;
        return {
          units: {
            speed: u.speed,
            distance: u.distance,
            depth: u.depth,
            length: u.length,
            temperature: u.temperature
          }
        };
      }
    };
  }

  // ---------- Signal K relay ----------

  private signalkMethods(ctx: LiveContext): Record<string, MethodHandler> {
    return {
      'signalk.subscribe': async (params) => {
        const { paths } = (params ?? {}) as { paths?: unknown };
        if (
          !Array.isArray(paths) ||
          paths.length === 0 ||
          !paths.every(
            (p) => typeof p === 'string' && p.length > 0 && !p.includes('*')
          )
        ) {
          throw new RpcError(
            'signalk.subscribe requires an array of literal Signal K paths',
            { code: RPC_ERRORS.INVALID_PARAMS, reason: 'INVALID_PATHS' }
          );
        }
        const subscriptionId = `sk-${++ctx.skSubSeq}`;
        ctx.skSubs.set(subscriptionId, paths as string[]);
        this.acquirePaths(paths as string[]);
        return { subscriptionId };
      },
      'signalk.unsubscribe': async (params) => {
        const { subscriptionId } = (params ?? {}) as {
          subscriptionId?: string;
        };
        const paths = subscriptionId ? ctx.skSubs.get(subscriptionId) : null;
        if (!paths) {
          throw new RpcError('Unknown subscriptionId', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'UNKNOWN_SUBSCRIPTION'
          });
        }
        ctx.skSubs.delete(subscriptionId as string);
        this.releasePaths(paths);
        return {};
      },
      'signalk.put': async (params) => {
        const { path, value } = (params ?? {}) as {
          path?: string;
          value?: unknown;
        };
        if (typeof path !== 'string' || !path.length) {
          throw new RpcError('signalk.put requires a path', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'INVALID_PATH'
          });
        }
        try {
          const result = await firstValueFrom(
            this.signalk.api.put(
              1,
              `vessels/self/${path.split('.').join('/')}`,
              value
            )
          );
          return result ?? {};
        } catch (err) {
          throw new RpcError(`PUT ${path} failed`, {
            reason: 'PUT_FAILED',
            data: { message: (err as Error)?.message }
          });
        }
      }
    };
  }

  private acquirePaths(paths: string[]) {
    const fresh: string[] = [];
    for (const path of paths) {
      const count = this.pathRefs.get(path) ?? 0;
      this.pathRefs.set(path, count + 1);
      if (count === 0) fresh.push(path);
    }
    if (fresh.length) {
      this.ensureSocket();
      this.sendSubscribe(fresh);
    }
  }

  private releasePaths(paths: string[]) {
    const gone: string[] = [];
    for (const path of paths) {
      const count = this.pathRefs.get(path) ?? 0;
      if (count <= 1) {
        this.pathRefs.delete(path);
        gone.push(path);
      } else {
        this.pathRefs.set(path, count - 1);
      }
    }
    if (gone.length && this.wsReady) {
      this.wsSend({
        context: 'vessels.self',
        unsubscribe: gone.map((path) => ({ path }))
      });
    }
    if (this.pathRefs.size === 0) {
      this.closeSocket();
    }
  }

  private ensureSocket() {
    if (this.ws) return;
    const endpoint = this.app.data?.server
      ? this.signalk.server?.endpoints?.['v1']?.['signalk-ws']
      : null;
    if (!endpoint) {
      console.warn('plotterext: no signalk-ws endpoint available');
      return;
    }
    let url = `${endpoint}?subscribe=none`;
    const token = this.app.getFBToken();
    if (token) {
      url += `&token=${token}`;
    }
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.wsReady = true;
      const paths = [...this.pathRefs.keys()];
      if (paths.length) this.sendSubscribe(paths);
    };
    ws.onmessage = (ev) => this.handleDelta(ev.data);
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.wsReady = false;
      if (this.pathRefs.size && !this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.ensureSocket();
        }, 3000);
      }
    };
    ws.onerror = () => {
      // onclose follows; reconnection handled there.
    };
  }

  private closeSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    this.wsReady = false;
    ws?.close();
  }

  private sendSubscribe(paths: string[]) {
    if (!this.wsReady) return;
    this.wsSend({
      context: 'vessels.self',
      subscribe: paths.map((path) => ({
        path,
        period: SK_PATH_PERIOD,
        policy: 'instant',
        minPeriod: 200
      }))
    });
  }

  private wsSend(msg: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleDelta(raw: unknown) {
    let delta: {
      updates?: Array<{
        timestamp?: string;
        $source?: string;
        source?: { label?: string };
        values?: Array<{ path: string; value: unknown }>;
      }>;
    };
    try {
      delta = JSON.parse(raw as string);
    } catch {
      return;
    }
    if (!Array.isArray(delta.updates)) return;
    for (const update of delta.updates) {
      if (!Array.isArray(update.values)) continue;
      for (const pv of update.values) {
        if (!pv?.path || !this.pathRefs.has(pv.path)) continue;
        const event = {
          path: pv.path,
          value: pv.value,
          timestamp: update.timestamp,
          $source: update.$source ?? update.source?.label
        };
        for (const ctx of this.contexts) {
          ctx.conn.publish(`sk.${pv.path}`, event);
        }
      }
    }
  }
}
