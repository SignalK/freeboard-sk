// Plotter extension host service.
//
// Responsibilities (phase 1-2 of the plotterExtensions host implementation —
// the widget stack):
//   - discover extension manifests from /signalk/v2/api/resources/plotterExtensions
//   - widget placement persisted in app config (anchor areas, gravity packing)
//   - one HostConnection (signalk-plotterext-bus) per live iframe context
//   - host API methods: state.get/set, signalk.subscribe/unsubscribe/put,
//     ui.openPanel/togglePanel, ui.openConfigPanel/toggleConfigPanel,
//     ui.closePanel, ui.listPanels (+ the panel.state event)
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
  inject,
  isDevMode,
  signal,
  untracked,
  type WritableSignal
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import * as uuid from 'uuid';

import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from 'src/app/modules/skresources/resources.service';
import { MapService } from 'src/app/modules/map/ol/lib/map.service';
import { FIT_MAX_ZOOM, fitBbox, type LonLatBox } from 'src/app/lib/map-fit';
import { FBCharts, FBNotes, LineString, Position } from 'src/app/types';
import {
  type ActionErrorReason,
  type BusPort,
  type ButtonErrorReason,
  type DecorateButtonsParams,
  type HandshakeContext,
  HostConnection,
  type WindowState,
  type MapView,
  matchesAny,
  MethodHandler,
  type NightModeState,
  normalizeBounds,
  type PanelState,
  RoutePoint,
  RpcError,
  RPC_ERRORS,
  type SetVisibilityParams,
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
  ResourceFilterSpec,
  WIDGET_CELL_GAP,
  WidgetCandidate,
  WidgetContribution,
  cellHeightPx,
  parseSize
} from './types';
import {
  applyDecorate,
  type DecorationOverride,
  resolveDecoration
} from './button-decorations';
import {
  isTemporaryRoute,
  temporaryRouteMarker
} from 'src/app/modules/course/temporary-route';
import { RouteBufferRegistry } from './route-buffer.registry';
import { createRouteMethods } from './route-methods';
import { createChartMethods } from './chart-methods';
import { createOverlayMethods } from './overlay-methods';
import {
  OverlayRegistry,
  overlayKey,
  type OverlayDefinition,
  type OverlayEntry
} from './overlay-registry';
import {
  DataOverlayModel,
  fetchJson,
  type FetchJson
} from './data-overlay-model';
import {
  parseOverlayStyle,
  resolveOverlayUrl,
  type ResolvedUrl
} from './data-overlay-style';
import type { OverlayStyle } from 'signalk-plotterext-bus/host';
import { createNightModeMethods } from './nightmode-methods';
import {
  createEventsMethods,
  type EventsMethodsDeps,
  publishEvent
} from './events-methods';
import { createResourceGroupMethods } from './resourcegroup-methods';
import { evalCondition, isValidFilterCondition } from './filter-condition';
import { parseParams } from './method-params';
import {
  actionApplies,
  invocationParams,
  usableActions,
  type ActionInvocation,
  type SelectedTarget,
  type UsableAction
} from './actions';
import { actionButtonLabel, extensionButtonId } from './action-button';
import { createWindowMethods, parseOpenWindow } from './window-methods';
import { ExtWindowService } from './windows/window.service';
import { ExtWindow } from './windows/types';
import { SKResourceGroupService } from 'src/app/modules/skresources/components/groups/groups.service';
import {
  FBMapInteractService,
  type MapPickOutcome
} from 'src/app/modules/map/fbmap-interact.service';
import { type MapPickedEvent, parsePickParams } from './map-pick';
import {
  buildRoutePoints,
  coordinatesMetaFromPoints,
  type PointMeta
} from 'src/app/modules/skresources/components/route-reorder.util';
import { SKStreamFacade } from 'src/app/modules/skstream/skstream.facade';

const STATE_STORAGE_KEY = 'fb-plotterext-state';
// Fixed state/scope key for the embedding-host connection (reverse embedding).
// The caller's asserted id is adopted into the handshake context.id, but state
// stays under this single scope — one embedder per server in practice.
const EMBEDDING_HOST_ID = 'embedding-host';

/** `setVisibility` choices: extension id → item id → shown. */
type VisibilityChoices = Record<string, Record<string, boolean>>;
type DecorationChoices = Record<string, Record<string, DecorationOverride>>;
const SK_PATH_PERIOD = 1000; // default delta period (ms) for relayed paths

interface ExtensionStateStore {
  [extensionId: string]: {
    extension?: Record<string, unknown>;
    instances?: { [instanceId: string]: Record<string, unknown> };
  };
}

interface LiveContext {
  extension: string;
  /** Background-runtime id, for a `background` context; otherwise null. */
  runtime: string | null;
  /** Whether the context is subscribed to `overlay.request` (for replay). */
  overlayRequestSubscribed?: boolean;
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

  /**
   * `buttons.setVisibility` choices, by extension then button id. Not
   * persisted: every button starts as its manifest `visible` says.
   */
  private readonly buttonVisibility = signal<VisibilityChoices>({});

  /**
   * `buttons.decorate` choices, by extension then button id. Not persisted:
   * every button starts as its manifest says. Kept while a button is hidden.
   */
  private readonly buttonDecorations = signal<DecorationChoices>({});

  /** Every button of compatible extensions, shown or hidden, in manifest order. */
  private readonly availableButtons = computed(() => {
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
   * The extension buttons the user may pick for the Action Button. A hidden
   * button is offered too: the extension decides when it shows, wherever the
   * user puts it.
   */
  readonly actionButtonChoices = computed(() =>
    this.availableButtons().map(({ extension, extensionName, button }) => ({
      id: extensionButtonId(extension, button.id),
      label: actionButtonLabel(extensionName, button.title)
    }))
  );

  /**
   * The shown toolbar buttons of compatible extensions, in manifest order,
   * each with the decoration it is drawn with. A hidden button is left out,
   * so the toolbar closes its gap.
   */
  readonly toolbarButtons = computed(() => {
    const visibility = this.buttonVisibility();
    const decorations = this.buttonDecorations();
    return this.availableButtons()
      .filter(
        ({ extension, button }) =>
          visibility[extension]?.[button.id] ?? button.visible !== false
      )
      .map((entry) => ({
        ...entry,
        decoration: resolveDecoration(
          entry.button,
          decorations[entry.extension]?.[entry.button.id]
        )
      }));
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

  // ---------- map actions (capability `actions`) ----------

  /** The actions of compatible extensions this host can offer, in manifest order. */
  readonly extensionActions = computed<UsableAction[]>(() => {
    const result: UsableAction[] = [];
    for (const [extension, manifest] of Object.entries(this.manifests())) {
      if (!this.isCompatible(manifest)) continue;
      result.push(
        ...usableActions(
          extension,
          manifest.name,
          manifest.actions,
          HOST_API_VERSION,
          (panel) => !!this.iframePanel(extension, panel)
        )
      );
    }
    return result;
  });

  /**
   * `actions.setVisibility` choices, by extension then action id. Not
   * persisted: every action starts as its manifest `visible` says.
   */
  private readonly actionVisibility = signal<VisibilityChoices>({});

  private actionVisible(a: UsableAction): boolean {
    return (
      this.actionVisibility()[a.extension]?.[a.action.id] ??
      a.action.visible !== false
    );
  }

  /** The visible actions that apply to a selected target, in manifest order. */
  actionsFor(sel: SelectedTarget): UsableAction[] {
    return this.extensionActions().filter(
      (a) => this.actionVisible(a) && actionApplies(a, sel)
    );
  }

  /**
   * The user chose an action on a target: perform it as a button would
   * (a toggle opens), then tell the extension's loaded contexts with
   * `action.invoked`. A panel or window the action loads has not attached
   * yet, so it is not among them; it finds the invocation in its handshake.
   */
  invokeAction(extension: string, actionId: string, sel: SelectedTarget) {
    const a = this.extensionActions().find(
      (x) => x.extension === extension && x.action.id === actionId
    );
    const action = a?.action.action;
    if (!a || !action || !this.actionVisible(a)) return;
    const invocation: ActionInvocation = { actionId, target: sel.target };
    switch (action.type) {
      case 'publish':
      case 'sendMessage':
        try {
          publishEvent(this.eventsDeps, extension, {
            topic: action.topic,
            params: invocationParams(action.params, invocation),
            scope: action.scope
          });
        } catch (err) {
          console.warn(
            `plotterext ${extension}: action "${actionId}" not published`,
            err
          );
        }
        break;
      case 'openPanel':
      case 'togglePanel':
        if (action.panel) this.openPanel(extension, action.panel, invocation);
        break;
      case 'openWindow':
      case 'toggleWindow':
        this.openTrackedWindow(
          this.actionWindows,
          `${extension}/${actionId}`,
          extension,
          action,
          false,
          invocation
        );
        break;
    }
    this.publishToExtension(extension, 'action.invoked', invocation);
  }

  /** `actions.setVisibility`, `buttons.setVisibility` and `buttons.decorate` for an extension context. */
  private visibilityMethods(extension: string): Record<string, MethodHandler> {
    return {
      'actions.setVisibility': this.setVisibilityMethod(
        extension,
        'actions',
        this.actionVisibility
      ),
      'buttons.setVisibility': this.setVisibilityMethod(
        extension,
        'buttons',
        this.buttonVisibility
      ),
      'buttons.decorate': this.decorateMethod(extension)
    };
  }

  /**
   * Sets the style, colours and badge of the calling extension's own buttons.
   * Every id must be one of the caller's manifest and at least one decoration
   * must be given; otherwise nothing changes. The last call wins.
   */
  private decorateMethod(extension: string): MethodHandler {
    return async (params) => {
      const { ids, ...decorations }: DecorateButtonsParams = await parseParams(
        (await import('./action-params')).DecorateButtonsParams,
        params,
        'buttons.badRequest' satisfies ButtonErrorReason
      );
      const given = {
        style: decorations.style,
        colors: decorations.colors,
        badge: decorations.badge
      };
      if (Object.values(given).every((value) => value === undefined)) {
        throw new RpcError('No decoration given', {
          code: RPC_ERRORS.INVALID_PARAMS,
          reason: 'buttons.badRequest' satisfies ButtonErrorReason
        });
      }
      const buttons = this.manifests()[extension]?.buttons;
      const own = new Set<unknown>(
        Array.isArray(buttons) ? buttons.map((button) => button?.id) : []
      );
      const unknown = ids.filter((id) => !own.has(id));
      if (unknown.length) {
        throw new RpcError(`Unknown button id: ${unknown.join(', ')}`, {
          reason: 'buttons.unknownId' satisfies ButtonErrorReason
        });
      }
      this.buttonDecorations.update((all) => {
        const mine = { ...all[extension] };
        for (const id of ids) mine[id] = applyDecorate(mine[id] ?? {}, given);
        return { ...all, [extension]: mine };
      });
      return {};
    };
  }

  /**
   * Shows or hides the calling extension's own actions or buttons, recording
   * the choice in `choices`. Every id must be one of
   * the caller's manifest; otherwise nothing changes. The last call wins.
   */
  private setVisibilityMethod(
    extension: string,
    kind: 'actions' | 'buttons',
    choices: WritableSignal<VisibilityChoices>
  ): MethodHandler {
    const badRequest: ActionErrorReason | ButtonErrorReason =
      `${kind}.badRequest` as const;
    const unknownId: ActionErrorReason | ButtonErrorReason =
      `${kind}.unknownId` as const;
    return async (params) => {
      const { ids, visible }: SetVisibilityParams = await parseParams(
        (await import('./action-params')).SetVisibilityParams,
        params,
        badRequest
      );
      const items = this.manifests()[extension]?.[kind];
      const own = new Set<unknown>(
        Array.isArray(items) ? items.map((item) => item?.id) : []
      );
      const unknown = ids.filter((id) => !own.has(id));
      if (unknown.length) {
        throw new RpcError(
          `Unknown ${kind.slice(0, -1)} id: ${unknown.join(', ')}`,
          { reason: unknownId }
        );
      }
      choices.update((all) => {
        const own = { ...all[extension] };
        for (const id of ids) own[id] = visible;
        return { ...all, [extension]: own };
      });
      return {};
    };
  }

  // ---------- map picks (capability `map.pick`) ----------

  /** The pick that is on and the context that asked for it. */
  private pickOwner: { pickId: string; ctx: LiveContext } | null = null;

  /**
   * `map.pick` / `map.cancelPick` for one context. The pick itself is the
   * map's (FBMapInteractService); this keeps who asked, so `map.picked`
   * reaches only that context.
   */
  private pickMethods(ctx: LiveContext): Record<string, MethodHandler> {
    return {
      'map.pick': async (params) => {
        const { prompt, rules } = parsePickParams(params);
        if (this.mapInteract.isBusyForPick()) {
          throw new RpcError('The user is in a modal interaction', {
            reason: 'map.pickBusy'
          });
        }
        const pickId = uuid.v4();
        this.mapInteract.startPick({
          pickId,
          extension: ctx.extension,
          extensionName: this.pickerName(ctx.extension),
          prompt,
          rules
        });
        this.pickOwner = { pickId, ctx };
        return { pickId };
      },
      'map.cancelPick': async (params) => {
        const { pickId } = (params ?? {}) as { pickId?: unknown };
        if (typeof pickId !== 'string') {
          throw new RpcError('map.cancelPick requires a pickId', {
            code: RPC_ERRORS.INVALID_PARAMS,
            reason: 'map.badRequest'
          });
        }
        if (this.pickOwner?.pickId === pickId && this.pickOwner.ctx === ctx) {
          this.mapInteract.endPick(pickId, { reason: 'extension' });
        }
        return {};
      }
    };
  }

  /**
   * Who the pick prompt says is asking: the extension's name, or, for the
   * app Freeboard is embedded in, which has no manifest, a plain label.
   */
  private pickerName(extension: string): string {
    if (extension === EMBEDDING_HOST_ID) return 'Embedding app';
    return this.manifests()[extension]?.name || extension;
  }

  /** Tell the context that asked how its pick ended (none for a silent end). */
  private onPickEnded(pickId: string, outcome: MapPickOutcome) {
    const owner = this.pickOwner;
    if (owner?.pickId !== pickId) return;
    this.pickOwner = null;
    if (!outcome || !this.contexts.has(owner.ctx)) return;
    const event: MapPickedEvent =
      'target' in outcome
        ? { pickId, target: outcome.target }
        : { pickId, cancelled: true, reason: outcome.reason };
    owner.ctx.conn.publish('map.picked', event);
  }

  // ---------- map overlays (capabilities `overlays.image`, `overlays.data`) ----------

  /**
   * Map overlays: their definitions, the user's show/fade choices (persisted
   * in config), the active-overlay budget, image-frame bookkeeping and each
   * data overlay's live state. The map draws `overlays.active()`; the chart
   * list shows `overlays.entries()`.
   */
  readonly overlays = inject(OverlayRegistry);

  /** Fetches a data overlay's style; replaceable in tests. */
  fetchOverlayJson: FetchJson = fetchJson;

  /** Origin of the Signal K server that server-relative overlay URLs resolve against. */
  private serverOrigin(): string {
    try {
      return new URL(this.app.hostDef?.url || window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }

  /** Data-overlay styles declared by URL: overlay key → resolved URL (null: refused). */
  private readonly dataStyleUrls = computed(() => {
    const origin = this.serverOrigin();
    const result = new Map<string, ResolvedUrl | null>();
    for (const [extension, manifest] of Object.entries(this.manifests())) {
      if (!this.isCompatible(manifest)) continue;
      for (const def of manifest.overlays ?? []) {
        if (def?.type === 'data' && typeof def.style === 'string') {
          result.set(
            overlayKey(extension, def.id),
            resolveOverlayUrl(def.style, origin)
          );
        }
      }
    }
    return result;
  });

  /** Styles loaded from a URL, by overlay key; `style` null when unusable. */
  private readonly fetchedStyles = signal<
    Record<string, { url: string; style: OverlayStyle | null }>
  >({});
  private readonly styleFetches = new Set<string>();

  private fetchDataStyles(urls: Map<string, ResolvedUrl | null>) {
    for (const [key, url] of urls) {
      if (!url) {
        if (!this.styleFetches.has(`${key} refused`)) {
          this.styleFetches.add(`${key} refused`);
          console.warn(
            `[plotterext] overlay ${key} omitted: its style URL is neither server-relative nor https`
          );
        }
        continue;
      }
      if (this.styleFetches.has(`${key} ${url.url}`)) continue;
      this.styleFetches.add(`${key} ${url.url}`);
      this.fetchOverlayJson(url, false)
        .then((json) => parseOverlayStyle(json))
        .catch((err: unknown): null => {
          console.warn(`[plotterext] could not load style ${url.url}:`, err);
          return null;
        })
        .then((style) => {
          if (!style) {
            console.warn(
              `[plotterext] overlay ${key} omitted: ${url.url} is not a version 8 style`
            );
          }
          this.fetchedStyles.update((all) => ({
            ...all,
            [key]: { url: url.url, style }
          }));
        });
    }
  }

  /** Live models by overlay key, kept while the overlay's style is unchanged. */
  private dataModels = new Map<
    string,
    { sig: string; model: DataOverlayModel }
  >();

  /**
   * A data overlay's style, parsed: inline, or once its URL has loaded. Null
   * while loading, or when it is refused or is not a version-8 style.
   */
  private dataOverlayStyle(key: string, style: unknown): OverlayStyle | null {
    if (typeof style !== 'string') return parseOverlayStyle(style);
    const url = this.dataStyleUrls().get(key);
    const fetched = this.fetchedStyles()[key];
    return url && fetched?.url === url.url ? fetched.style : null;
  }

  /**
   * Overlays contributed by compatible extensions. An image overlay must name
   * one of this host's background runtimes of its own manifest; a data overlay
   * must have a loadable version-8 style. Anything else, or an overlay of an
   * unknown `type`, is omitted.
   */
  private readonly overlayDefinitions = computed<OverlayDefinition[]>(() => {
    const runtimes = new Set(this.backgroundRuntimes().map((r) => r.key));
    const origin = this.serverOrigin();
    const models = new Map<string, { sig: string; model: DataOverlayModel }>();
    const result: OverlayDefinition[] = [];
    for (const [extension, manifest] of Object.entries(this.manifests())) {
      if (!this.isCompatible(manifest)) continue;
      const seen = new Set<string>();
      for (const def of manifest.overlays ?? []) {
        if (
          typeof def?.id !== 'string' ||
          typeof def.title !== 'string' ||
          seen.has(def.id) ||
          (def.apiVersion !== undefined && def.apiVersion !== HOST_API_VERSION)
        ) {
          continue;
        }
        let model: DataOverlayModel | undefined;
        if (def.type === 'image') {
          if (
            typeof def.runtime !== 'string' ||
            !runtimes.has(`${extension}/${def.runtime}`)
          ) {
            continue;
          }
        } else if (def.type === 'data') {
          const key = overlayKey(extension, def.id);
          const style = this.dataOverlayStyle(key, def.style);
          if (!style) continue;
          const sig = `${origin} ${JSON.stringify(style)}`;
          const kept = this.dataModels.get(key);
          model =
            kept?.sig === sig
              ? kept.model
              : new DataOverlayModel(style, origin, this.fetchOverlayJson);
          models.set(key, { sig, model });
        } else {
          continue;
        }
        seen.add(def.id);
        result.push({
          extension,
          extensionName: manifest.name,
          def,
          panels: manifest.panels,
          ...(model ? { model } : {})
        });
      }
    }
    this.dataModels = models;
    return result;
  });

  /**
   * Ask an overlay's runtime for a frame of the given view (called by the
   * overlay's map layer). `worldOffset` is the render-space shift of the
   * world copy on screen; frames answering this request are drawn there.
   */
  requestOverlayFrame(
    key: string,
    view: Parameters<OverlayRegistry['newRequest']>[1],
    worldOffset: number
  ) {
    const entry = this.overlays.entry(key);
    if (!entry?.runtime) return;
    const request = this.overlays.newRequest(key, view, worldOffset);
    if (request) {
      this.publishToRuntime(
        entry.extension,
        entry.runtime,
        'overlay.request',
        request
      );
    }
  }

  /** Overlay states last reported, for diffing into `overlay.state` events. */
  private lastOverlayStates = new Map<string, string>();

  /**
   * Emit `overlay.state` to the owning extension for each overlay whose
   * visibility, opacity or suspension changed — whoever changed it. The first
   * report of an overlay seeds silently; a runtime reads the starting state
   * with `overlay.list`.
   */
  private emitOverlayStates(entries: OverlayEntry[]) {
    const next = new Map<string, string>();
    for (const e of entries) {
      const state = {
        overlayId: e.id,
        visible: e.visible,
        opacity: e.opacity,
        suspended: e.suspended
      };
      const sig = JSON.stringify(state);
      next.set(e.key, sig);
      const prev = this.lastOverlayStates.get(e.key);
      if (prev !== undefined && prev !== sig) {
        this.publishToExtension(e.extension, 'overlay.state', state);
      }
      if (!e.visible || e.suspended) {
        this.overlays.clearRequest(e.key);
      }
    }
    this.lastOverlayStates = next;
  }

  /**
   * A runtime has just subscribed to `overlay.request`: send it the latest
   * request of each of its overlays, which the map layer may have made before
   * the runtime's iframe had loaded. Only on the transition — the hook fires
   * for every subscription change, and a runtime's later subscriptions (to
   * `overlay.state`, Signal K paths) must not resend requests it already has.
   * Deferred one tick so it lands after the `events.subscribe` call resolves.
   */
  private replayOverlayRequests(ctx: LiveContext, patterns: string[]) {
    const subscribed = matchesAny(patterns, 'overlay.request');
    const newly = subscribed && !ctx.overlayRequestSubscribed;
    ctx.overlayRequestSubscribed = subscribed;
    if (!ctx.runtime || !newly) return;
    const runtime = ctx.runtime;
    setTimeout(() => {
      if (!this.contexts.has(ctx)) return;
      for (const request of this.overlays.latestRequestsFor(
        ctx.extension,
        runtime
      )) {
        ctx.conn.publish('overlay.request', request);
      }
    }, 0);
  }

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
      /** The action invocation that loaded the panel, for its handshake. */
      invocation?: ActionInvocation;
    }>
  >([]);

  readonly visiblePanel = computed(
    () => this.openPanels().find((p) => p.visible) ?? null
  );

  /**
   * The extension's iframe panel `panelId`, if it has one this host can show.
   * A contribution that targets a newer host API than we implement is skipped.
   */
  private iframePanel(
    extension: string,
    panelId: string
  ): PanelContribution | undefined {
    const panel = this.manifests()[extension]?.panels?.find(
      (p) => p.id === panelId
    );
    if (!panel || panel.type !== 'iframe' || !panel.url) return undefined;
    if (
      panel.apiVersion !== undefined &&
      panel.apiVersion !== HOST_API_VERSION
    ) {
      return undefined;
    }
    return panel;
  }

  openPanel(
    extension: string,
    panelId: string,
    invocation?: ActionInvocation
  ): boolean {
    const panel = this.iframePanel(extension, panelId);
    if (!panel) return false;
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
      return [
        ...retained,
        {
          key,
          extension,
          panel,
          visible: true,
          ...(invocation ? { invocation } : {})
        }
      ];
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

  // ---------- panel state (capability `panels.state`) ----------

  /**
   * Every loaded panel's state, keyed: drawer panels (visible while the drawer
   * shows them) and open configuration dialogs (always visible while open).
   * Freeboard has no panel collapse, so `collapsed` is always false.
   */
  private readonly panelStates = computed(() => {
    const states = new Map<string, { extension: string; state: PanelState }>();
    for (const p of this.openPanels()) {
      states.set(`drawer:${p.key}`, {
        extension: p.extension,
        state: { panel: p.panel.id, visible: p.visible, collapsed: false }
      });
    }
    for (const c of this.configPanels()) {
      states.set(`config:${c.id}`, {
        extension: c.extension,
        state: {
          panel: c.panel,
          visible: true,
          collapsed: false,
          ...(c.targetInstance ? { targetInstance: c.targetInstance } : {}),
          ...(c.targetOverlay ? { targetOverlay: c.targetOverlay } : {})
        }
      });
    }
    return states;
  });

  /** `ui.listPanels`: the loaded panels of one extension. */
  listPanels(extension: string): PanelState[] {
    return [...this.panelStates().values()]
      .filter((s) => s.extension === extension)
      .map((s) => s.state);
  }

  /** Panel states last reported, for diffing into `panel.state` events. */
  private prevPanelStates = new Map<
    string,
    { extension: string; state: PanelState }
  >();

  /**
   * Emit `panel.state` to the owning extension for each panel whose visibility
   * changed since the last run, whatever changed it (origin-transparent). A
   * panel that left the registry while visible — an `onOpen` panel dropped, a
   * config dialog closed — reports `visible: false`; one already hidden is
   * silent, as is any panel whose state did not change. Hides go out before
   * shows, so a switch never looks like two panels on screen at once.
   */
  private emitPanelStates(
    states: Map<string, { extension: string; state: PanelState }>
  ): void {
    const prev = this.prevPanelStates;
    this.prevPanelStates = states;
    const changed: Array<{ extension: string; state: PanelState }> = [];
    for (const [key, old] of prev) {
      if (!states.has(key) && old.state.visible) {
        changed.push({
          extension: old.extension,
          state: { ...old.state, visible: false }
        });
      }
    }
    for (const [key, cur] of states) {
      // a panel not loaded before counts as hidden: loading it hidden is no change
      if ((prev.get(key)?.state.visible ?? false) !== cur.state.visible) {
        changed.push(cur);
      }
    }
    changed.sort((x, y) => Number(x.state.visible) - Number(y.state.visible));
    for (const c of changed) {
      this.publishToExtension(c.extension, 'panel.state', c.state);
    }
  }

  /** `ui.openPanel` / `ui.togglePanel` / `ui.listPanels` for an extension context. */
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
      },
      'ui.listPanels': async () => ({ panels: this.listPanels(extension) })
    };
  }

  // ---------- windows ----------

  /** The window each `openWindow` / `toggleWindow` button opened. */
  private buttonWindows = new Map<string, string>();

  /** A window's state, if `extension` owns it and it is open. */
  private ownedWindow(
    extension: string,
    windowId: string
  ): WindowState | undefined {
    const w = this.windows.get(windowId);
    return w && w.extension === extension ? this.windows.stateOf(w) : undefined;
  }

  /**
   * The `ui.*Window` methods (capability `windows`) for one context. `self` is
   * the calling window's id when the context is itself a window.
   */
  private windowMethods(
    extension: string,
    self: string | null
  ): Record<string, MethodHandler> {
    return createWindowMethods({
      self,
      panel: (id) => this.iframePanel(extension, id),
      open: (panel, req) => {
        const w = this.windows.open(extension, panel, req);
        return typeof w === 'string' ? w : this.windows.stateOf(w);
      },
      owned: (id) => this.ownedWindow(extension, id),
      openOf: (panel) =>
        this.windows.ofExtension(extension).find((w) => w.panel.id === panel)
          ?.id,
      update: (id, change) => {
        this.windows.update(id, change);
        return this.ownedWindow(extension, id) as WindowState;
      },
      focus: (id) => this.windows.focus(id),
      close: (id) => this.windows.close(id, 'extension'),
      list: () =>
        this.windows.ofExtension(extension).map((w) => this.windows.stateOf(w))
    });
  }

  /** The window each `openWindow` / `toggleWindow` action opened. */
  private actionWindows = new Map<string, string>();

  /**
   * An `openWindow` / `toggleWindow` button or action. It tracks the window it
   * opened (in `tracked`, under `key`): choosing it again shows and raises
   * that window, or with `toggle` hides or closes it the way its own close
   * control would. `invocation` goes to a window the action opens.
   */
  private openTrackedWindow(
    tracked: Map<string, string>,
    key: string,
    extension: string,
    action: ButtonContribution['action'],
    toggle: boolean,
    invocation?: ActionInvocation
  ) {
    const trackedId = tracked.get(key);
    const open = trackedId ? this.windows.get(trackedId) : undefined;
    if (trackedId && !open) tracked.delete(key);
    if (open) {
      if (toggle && open.visible) {
        this.windows.userClose(open.id);
      } else {
        this.windows.update(open.id, { visible: true });
        this.windows.focus(open.id);
      }
      return;
    }
    try {
      const { panel: panelId, req } = parseOpenWindow(action);
      const panel = this.iframePanel(extension, panelId);
      if (!panel) {
        console.warn('plotterext: window action names no panel', key);
        return;
      }
      const w = this.windows.open(extension, panel, {
        ...req,
        ...(invocation ? { invocation } : {})
      });
      if (typeof w === 'string') {
        console.warn('plotterext: window action could not open', key, w);
      } else {
        tracked.set(key, w.id);
      }
    } catch (err) {
      console.warn('plotterext: unusable window action', key, err);
    }
  }

  /**
   * Keep windows in step with the collection: an extension that left takes
   * its windows with it, and a window whose panel left its manifest closes.
   */
  private syncWindows() {
    const manifests = this.manifests();
    for (const extension of new Set(
      this.windows.windows().map((w) => w.extension)
    )) {
      const manifest = manifests[extension];
      if (!manifest || !this.isCompatible(manifest)) {
        this.windows.closeExtension(extension);
      } else {
        this.windows.closeMissingPanels(
          extension,
          new Set(
            (manifest.panels ?? [])
              .filter((p) => this.iframePanel(extension, p.id))
              .map((p) => p.id)
          )
        );
      }
    }
  }

  /**
   * An extension that left the collection forgets its `setVisibility` and
   * `buttons.decorate` choices, so when it comes back its buttons and actions
   * start from the manifest again, as its reloaded runtime does.
   */
  private dropDepartedChoices() {
    const manifests = this.manifests();
    const present = (extension: string) => {
      const manifest = manifests[extension];
      return !!manifest && this.isCompatible(manifest);
    };
    const all: WritableSignal<Record<string, unknown>>[] = [
      this.actionVisibility,
      this.buttonVisibility,
      this.buttonDecorations
    ];
    for (const choices of all) {
      const extensions = Object.keys(choices());
      if (extensions.every(present)) continue;
      choices.update((all) =>
        Object.fromEntries(
          Object.entries(all).filter(([extension]) => present(extension))
        )
      );
    }
  }

  handleButtonAction(extension: string, button: ButtonContribution) {
    const action = button.action;
    if (!action) return;
    if (action.type === 'openWindow' || action.type === 'toggleWindow') {
      this.openTrackedWindow(
        this.buttonWindows,
        `${extension}/${button.id}`,
        extension,
        action,
        action.type === 'toggleWindow'
      );
      return;
    }
    if (action.type === 'publish' || action.type === 'sendMessage') {
      // Fire-and-forget: publish onto the bus exactly as events.publish would
      // for this extension. `sendMessage` is the permanent deprecated alias;
      // with no `scope` both reach every subscribed context (scope 'all').
      try {
        publishEvent(this.eventsDeps, extension, {
          topic: action.topic,
          params: action.params,
          scope: action.scope
        });
      } catch (err) {
        console.warn(
          `plotterext ${extension}: button "${button.id}" not published`,
          err
        );
      }
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
      matches = spec.match.every((cond) => evalCondition(cond, resource));
    }
    return spec.mode === 'exclude' ? !matches : matches;
  }

  private contexts = new Set<LiveContext>();
  private windows = inject(ExtWindowService);
  private mapInteract = inject(FBMapInteractService);
  // Detach handle for the embedding-host connection, if one was stood up.
  private embeddingHostDetach: (() => void) | null = null;

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
    private routeRegistry: RouteBufferRegistry,
    private stream: SKStreamFacade,
    private skgroups: SKResourceGroupService
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
    // Relay window changes (`window.bounds` / `window.state` / `window.closed`)
    // to the extension that owns the window. App-lifetime singleton.
    this.windows.changes.subscribe((c) =>
      this.publishToExtension(c.extension, c.event, c.payload)
    );
    // Deliver `map.picked` to the context that asked. App-lifetime singleton.
    this.mapInteract.pickEnded.subscribe(({ pickId, outcome }) =>
      this.onPickEnded(pickId, outcome)
    );
    // Keep windows and visibility choices in step with the collection,
    // whoever updates it.
    effect(() => {
      this.manifests();
      untracked(() => {
        this.syncWindows();
        this.dropDepartedChoices();
      });
    });
    // Relay every group apply — the user's Resource Groups checkbox or an
    // extension's resourceGroup.apply — as `resourceGroup.applied`
    // (origin-transparent). App-lifetime singleton: lives for the session.
    this.skgroups.applied$.subscribe((e) =>
      this.broadcastMessage('resourceGroup.applied', e)
    );
    // Mirror Freeboard's displayed (selected) routes into the visible-route
    // registry so the `routes` capability reflects them — including routes
    // restored from a previous session's selection state on load. Reads
    // skres.routes() so it re-runs whenever the displayed set changes.
    effect(() => this.syncVisibleFromSelections());
    // Emit `chart.*` events for every change to the displayed charts, whether it
    // came from a host method or the user's own chart controls (origin-transparent).
    effect(() => this.emitChartChanges(this.skres.charts()));
    // Emit `nightMode.changed` when the resolved night state changes from a
    // server `environment.mode` flip (while auto-night is on) or a manual force.
    // Auto-only changes that don't move the resolved state are emitted directly
    // by applyNightMode; emitNightModeChange dedups so each real change fires once.
    effect(() => this.emitNightModeChange(this.readNightMode()));
    // Emit `map.view` whenever the chart viewport settles, whether the user
    // panned/zoomed, the host recentred, or an extension called map.center /
    // map.fitBounds (origin-transparent). mapExtent is written once per OL
    // moveend, so the effect fires per settled change, not per frame.
    effect(() => this.emitMapViewChange(this.mapView()));
    // Emit `panel.state` whenever a loaded panel is shown or hidden — the
    // drawer's close button, a panel switch, any extension's ui.* call, a
    // config dialog opening or closing (origin-transparent). The registry
    // signals are the trigger; publishing is not.
    effect(() => {
      const states = this.panelStates();
      untracked(() => this.emitPanelStates(states));
    });
    // Map overlays: follow the collection (fetching data overlays' styles),
    // load the user's saved choices, and emit `overlay.state` for every change
    // (origin-transparent).
    this.overlays.setPersist((settings) => {
      this.app.config.plotterExtensions.overlays = settings;
      this.app.saveConfig();
    });
    this.overlays.loadSettings(this.app.config.plotterExtensions?.overlays);
    this.overlays.setConfigOpener((entry) =>
      this.openOverlayConfigPanel(entry)
    );
    effect(() => {
      const urls = this.dataStyleUrls();
      untracked(() => this.fetchDataStyles(urls));
    });
    effect(() => {
      const defs = this.overlayDefinitions();
      untracked(() => this.overlays.setDefinitions(defs));
    });
    effect(() => {
      const entries = this.overlays.entries();
      untracked(() => this.emitOverlayStates(entries));
    });
  }

  /**
   * Bring the registry in line with the host's displayed saved routes: show any
   * that are displayed but not yet mirrored (emits `route.visible saved:true`),
   * and hide mirrors of routes no longer displayed that have no pending edits
   * (emits `route.hidden saved:true`). Drafts and dirty edits are left alone.
   */
  /** Build RoutePoints from a route's geometry + coordinatesMeta, carrying each
   *  point's name, description AND waypoint link so they survive a round-trip
   *  through the registry and back into coordinatesMeta on save. */
  private pointsFromRoute(
    coords: Position[],
    meta?: PointMeta[]
  ): RoutePoint[] {
    return buildRoutePoints(coords, meta);
  }

  /** Deep-compare two point lists (position + name + description + href) so a
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
        (p.position[2] ?? null) === (q.position[2] ?? null) &&
        (p.name ?? null) === (q.name ?? null) &&
        (p.description ?? null) === (q.description ?? null) &&
        (p.href ?? null) === (q.href ?? null)
      );
    });
  }

  private syncVisibleFromSelections(): void {
    const displayed = this.skres.routes();
    const displayedHrefs = new Set(displayed.map((r) => r[0]));
    for (const [id, route] of displayed) {
      const coords = (route.feature?.geometry?.coordinates ?? []) as Position[];
      const meta = route.feature?.properties?.coordinatesMeta as
        PointMeta[] | undefined;
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
      if (
        buf.saved &&
        !buf.dirty &&
        buf.href &&
        !displayedHrefs.has(buf.href)
      ) {
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

  /** Host API handlers for the `charts` capability. */
  private chartMethods(): Record<string, MethodHandler> {
    return createChartMethods({
      listAvailableOrdered: () => this.skres.chartsForHostApi(),
      setVisibility: (ids, visible) =>
        this.skres.setChartsVisibility(ids, visible),
      setOpacity: (ids, opacity) => this.skres.setChartsOpacity(ids, opacity),
      setOrder: (order) => this.skres.setChartsOrder(order),
      isTemporal: (chart) => this.skres.chartIsTemporal(chart),
      setTime: (ids, time) => this.skres.setChartsTime(ids, time)
    });
  }

  /** Host API handlers for the `resourceGroups` capability. */
  private resourceGroupMethods(): Record<string, MethodHandler> {
    return createResourceGroupMethods({
      fetchGroup: (id) => this.skgroups.fromServer(id),
      applyGroup: (id, group) => this.skgroups.applyGroup(id, group)
    });
  }

  /** Subscription-gated delivery used by `events.publish` and publish buttons. */
  private readonly eventsDeps: EventsMethodsDeps = {
    broadcast: (event, params) => this.broadcastMessage(event, params),
    publishToExtension: (extension, event, params) =>
      this.publishToExtension(extension, event, params)
  };

  /** Host API handlers for the `nightMode` capability. */
  private nightModeMethods(): Record<string, MethodHandler> {
    return createNightModeMethods({
      getState: () => this.readNightMode(),
      setState: (next) => this.applyNightMode(next)
    });
  }

  /**
   * The resolved night-mode state. `enabled` mirrors the `app-night` display
   * class (the auto-derived state OR a manual force); `auto` is the "Auto-set
   * Night Mode" setting that tracks the server's `environment.mode`.
   */
  private readNightMode(): NightModeState {
    return {
      enabled: this.stream.selfNightMode() || this.app.uiCtrl().forceNightMode,
      auto: this.app.config.display.nightMode ?? false
    };
  }

  /**
   * Apply a `nightMode.set`. `auto` toggles server-following (and, when turned
   * on, clears any manual force so it purely tracks `environment.mode`); an
   * explicit `enabled` is a manual override that takes control off the server
   * (auto → false) and forces the resolved state. Recomputes the auto-derived
   * state immediately so the change takes effect now, then emits.
   */
  private applyNightMode(next: Partial<NightModeState>): void {
    const auto = next.auto;
    if (typeof auto === 'boolean') {
      if (auto) {
        // Following the server: drop any manual force so it purely tracks
        // environment.mode.
        this.app.uiCtrl.update((c) => ({ ...c, forceNightMode: false }));
      } else if (typeof next.enabled !== 'boolean') {
        // Stop following without an explicit target: hold the current resolved
        // state by pinning it as a manual force (read before we clear auto).
        const held = this.readNightMode().enabled;
        this.app.uiCtrl.update((c) => ({ ...c, forceNightMode: held }));
      }
      this.app.config.display.nightMode = auto;
      this.app.uiConfig.update((c) => ({ ...c, autoNightMode: auto }));
    }
    const enabled = next.enabled;
    if (typeof enabled === 'boolean') {
      this.app.config.display.nightMode = false;
      this.app.uiConfig.update((c) => ({ ...c, autoNightMode: false }));
      this.app.uiCtrl.update((c) => ({ ...c, forceNightMode: enabled }));
    }
    this.stream.refreshSelfNightMode();
    this.emitNightModeChange(this.readNightMode());
  }

  /** Last night-mode state broadcast, for de-duping `nightMode.changed`. */
  private prevNightMode: NightModeState | null = null;

  /**
   * Broadcast `nightMode.changed` when the resolved state changes, from any
   * origin. Seeds silently on the first run (matching the chart-event pattern)
   * and de-dupes so the reactive effect and the imperative applyNightMode path
   * together emit exactly once per real change.
   */
  private emitNightModeChange(state: NightModeState): void {
    const prev = this.prevNightMode;
    this.prevNightMode = state;
    if (prev === null) {
      return;
    }
    if (prev.enabled === state.enabled && prev.auto === state.auto) {
      return;
    }
    this.broadcastMessage('nightMode.changed', state);
  }

  /** Topmost-first id order + per-chart opacity and shown instant of the last
   *  displayed-chart set, for diffing successive `skres.charts()` emissions
   *  into `chart.*` events. */
  private prevChartSnapshot: {
    order: string[];
    opacity: Map<string, number>;
    time: Map<string, string | null>;
  } | null = null;

  /**
   * Diff the displayed chart set against the previous snapshot and emit the
   * fine-grained `chart.*` events. Delivery is subscription-gated by
   * broadcastMessage. A show/hide emits `chart.visibility`; an opacity change on
   * a still-displayed chart emits `chart.opacity`, a retarget emits
   * `chart.time`; a genuine reorder of the surviving set emits `chart.order`.
   * The first (seeding) run emits nothing.
   */
  private emitChartChanges(charts: FBCharts): void {
    const order = charts.map((c) => c[0]).reverse(); // topmost-first
    const opacity = new Map<string, number>(
      charts.map((c) => [
        c[0],
        typeof c[1]?.defaultOpacity === 'number' ? c[1].defaultOpacity : 1
      ])
    );
    const time = new Map<string, string | null>(
      charts.map((c) => [c[0], c[1]?.timeValue ?? null])
    );
    const prev = this.prevChartSnapshot;
    this.prevChartSnapshot = { order, opacity, time };
    if (!prev) {
      return;
    }

    const prevSet = new Set(prev.order);
    const currSet = new Set(order);
    for (const id of order) {
      if (!prevSet.has(id)) {
        this.broadcastMessage('chart.visibility', { id, visible: true });
      }
    }
    for (const id of prev.order) {
      if (!currSet.has(id)) {
        this.broadcastMessage('chart.visibility', { id, visible: false });
      }
    }
    for (const [id, op] of opacity) {
      const before = prev.opacity.get(id);
      if (before !== undefined && before !== op) {
        this.broadcastMessage('chart.opacity', { id, opacity: op });
      }
    }
    // Origin-transparent: the user's own Time palette lands here the same way
    // an extension's chart.setTime does.
    for (const [id, t] of time) {
      if (prev.time.has(id) && prev.time.get(id) !== t) {
        this.broadcastMessage('chart.time', { id, time: t });
      }
    }
    // Fire chart.order only when the relative order of the charts common to both
    // snapshots actually changed — a pure show/hide is already covered above.
    const prevCommon = prev.order.filter((id) => currSet.has(id));
    const currCommon = order.filter((id) => prevSet.has(id));
    if (
      prevCommon.length === currCommon.length &&
      prevCommon.some((id, i) => id !== currCommon[i])
    ) {
      this.broadcastMessage('chart.order', { order });
    }
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
      // routeHide (not a bare selectionRemove) — while the routes collection is
      // unfiltered ("show all", the default) selectionRemove is a no-op, so the
      // route would stay on the chart while the registry reported it hidden.
      this.skres.routeHide(buf.href);
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
        // The server rejected the delete — surface it and reject so route.delete
        // reports failure instead of letting the extension drop local state for
        // a route that still exists.
        this.app.parseHttpErrorResponse(err);
        throw new RpcError('Failed to delete route', {
          reason: 'routes.deleteFailed'
        });
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
      PointMeta[] | undefined;
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
      this.routeRegistry.show({
        routeId,
        name,
        description,
        points,
        href: routeId
      });
    }
    // Mark the edit dirty (in both the new-mirror and existing-buffer cases)
    // before persisting, so a failed PUT leaves an unsaved edit as dirty rather
    // than a clean saved route, and extensions still see route.dirty.
    this.routeRegistry.replace(routeId, points);
    buf = this.routeRegistry.get(routeId);
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
   * identically. Pass `dialog:true` to prompt for the name/description,
   * `temporary:true` to store a never-saved route as a temporary route (see
   * `course/temporary-route.ts`), and `promote:true` when the user saves a
   * temporary route to keep it. `route.save` passes neither, so an extension
   * saving a temporary route leaves it temporary.
   */
  async saveBuffer(
    routeId: string,
    opts: {
      name?: string;
      description?: string;
      dialog?: boolean;
      temporary?: boolean;
      promote?: boolean;
    } = {}
  ): Promise<{ href: string; rev: number } | null> {
    const buf = this.routeRegistry.get(routeId);
    if (!buf) {
      return null;
    }
    const [, route] = this.skres.buildRoute(
      buf.points.map((p) => p.position) as LineString
    );
    // buildRoute keeps only positions — carry the per-point names, descriptions
    // and waypoint links, and the route-level description, so they are not
    // silently dropped on save.
    const properties = (route.feature.properties ??= {});
    const coordinatesMeta = coordinatesMetaFromPoints(buf.points);
    if (coordinatesMeta) {
      properties.coordinatesMeta = coordinatesMeta;
    }
    route.name = opts.name ?? buf.name ?? '';
    route.description = opts.description ?? buf.description ?? '';
    if (opts.temporary && !buf.href) {
      properties.temporary = temporaryRouteMarker(new Date());
    }
    const stored = buf.href
      ? this.skres.fromCache('routes', buf.href)?.[1]
      : undefined;
    if (isTemporaryRoute(stored) && !opts.promote) {
      properties.temporary = stored?.feature.properties?.temporary;
    }
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
      // names it. Resolves null on cancel; rejects on a server failure, which
      // we surface as routes.saveFailed rather than letting it look like a cancel.
      try {
        savedId = await this.skres.saveNewRoute(route);
      } catch {
        throw new RpcError('Failed to save route', {
          reason: 'routes.saveFailed'
        });
      }
    } else {
      // Headless create: persist directly with the supplied (or buffer) name.
      try {
        const rte = await this.skres.postToServer('routes', route);
        savedId = rte.id ?? null;
      } catch (err) {
        this.app.parseHttpErrorResponse(err);
        throw new RpcError('Failed to save route', {
          reason: 'routes.saveFailed'
        });
      }
      // Without an id the new route cannot be found again; only a dismissed
      // dialog counts as a cancel.
      if (!savedId) {
        throw new RpcError('Failed to save route', {
          reason: 'routes.saveFailed'
        });
      }
      // The dialog path (saveNewRoute) selects the new route; do the same for
      // the headless path so it stays displayed after a refresh.
      this.skres.selectionAdd('routes', savedId);
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
    // The user config is final by now (server-stored for a signed-in user):
    // reload the overlay choices from it, so the first change does not write a
    // stale local copy back over the server's.
    this.overlays.loadSettings(this.app.config.plotterExtensions?.overlays);
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
    this.attachEmbeddingHostOnce();
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

  /**
   * Occupancy map of an anchor area (sized per ANCHOR_GRID): occupied[row][col].
   * Driven by `activeWidgets()` (not the raw `placements()`) so it agrees with
   * what the overlay renders: an orphaned placement — one whose extension is
   * disabled, uninstalled, or renamed — is not drawn and must not block its
   * cell, otherwise the empty-looking cell stays un-longpressable (#433).
   */
  private occupancy(anchor: AnchorId): boolean[][] {
    const { cols, rows } = ANCHOR_GRID[anchor];
    const occupied = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    );
    for (const placed of this.activeWidgets()) {
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
   * Connect one extension context to the bus. Every kind gets the shared host
   * API; `methods` adds its kind-specific ones and wins over a shared entry of
   * the same name. `stateInstance` is the instance `state.*` defaults to (null:
   * the extension scope). Returns a detach function.
   */
  private attachContext(opts: {
    port: BusPort;
    extension: string;
    context: HandshakeContext;
    stateInstance: string | null;
    methods?: Record<string, MethodHandler>;
    adoptCallerId?: boolean;
    runtime?: string;
  }): () => void {
    const ctx: LiveContext = {
      extension: opts.extension,
      runtime: opts.runtime ?? null,
      conn: null as unknown as HostConnection,
      skSubs: new Map(),
      skSubSeq: 0
    };
    ctx.conn = new HostConnection({
      port: opts.port,
      hostInfo: this.hostInfo(),
      adoptCallerId: opts.adoptCallerId,
      context: opts.context,
      onSubscriptionsChanged: (patterns) =>
        this.replayOverlayRequests(ctx, patterns),
      methods: {
        ...this.stateMethods(opts.extension, opts.stateInstance),
        ...this.signalkMethods(ctx),
        ...this.unitsMethods(),
        ...this.resourcesMethods(opts.extension),
        ...this.mapMethods(),
        ...this.routeMethods(),
        ...this.chartMethods(),
        ...this.nightModeMethods(),
        ...this.resourceGroupMethods(),
        ...createOverlayMethods(this.overlays, opts.extension, ctx.runtime),
        ...createEventsMethods(this.eventsDeps, opts.extension),
        ...this.uiPanelMethods(opts.extension),
        ...this.visibilityMethods(opts.extension),
        ...this.pickMethods(ctx),
        ...this.windowMethods(
          opts.extension,
          opts.context.kind === 'window'
            ? (opts.context.windowId ?? null)
            : null
        ),
        ...opts.methods
      },
      onError: (err) =>
        console.warn(`plotterext ${opts.context.kind} error`, err)
    });
    this.contexts.add(ctx);
    return () => this.detach(ctx);
  }

  /** The host end of an extension iframe, pinned to its asset's origin. */
  private iframePort(iframe: HTMLIFrameElement, url: string): BusPort {
    return windowPort(iframe.contentWindow as Window, {
      origin: this.assetOrigin(url)
    });
  }

  /**
   * Attach a widget iframe to the host. Returns a detach function.
   * Call once the iframe element exists (the connection handles the
   * extension's bus.ready retries, so load-order does not matter).
   */
  attachWidget(iframe: HTMLIFrameElement, placed: PlacedWidget): () => void {
    const widgetUrl =
      this.widgetDef(placed.extension, placed.widget)?.url ?? '';
    return this.attachContext({
      port: this.iframePort(iframe, widgetUrl),
      extension: placed.extension,
      context: {
        kind: 'widget',
        id: placed.widget,
        instanceId: placed.instanceId,
        targetInstance: null
      },
      stateInstance: placed.instanceId,
      methods: {
        'ui.openConfigPanel': async () => {
          this.openConfigPanel(placed);
          return {};
        },
        'ui.toggleConfigPanel': async () => {
          this.toggleConfigPanel(placed);
          return {};
        }
      }
    });
  }

  /**
   * Attach a panel iframe (e.g. a widget or overlay configuration panel).
   * targetInstance scopes the panel's instance state to the widget being
   * configured; an overlay's panel (targetOverlay) has no instance, so its
   * state defaults to the extension scope.
   */
  attachPanel(
    iframe: HTMLIFrameElement,
    opts: {
      extension: string;
      panel: PanelContribution;
      targetInstance?: string | null;
      targetWidget?: string | null;
      targetOverlay?: string | null;
      invocation?: ActionInvocation;
      close: () => void;
    }
  ): () => void {
    return this.attachContext({
      port: this.iframePort(iframe, opts.panel.url ?? ''),
      extension: opts.extension,
      context: {
        kind: 'panel',
        id: opts.panel.id,
        instanceId: null,
        targetInstance: opts.targetInstance ?? null,
        targetWidget: opts.targetWidget ?? null,
        targetOverlay: opts.targetOverlay ?? null,
        ...(opts.invocation ? { invocation: opts.invocation } : {})
      },
      stateInstance: opts.targetInstance ?? null,
      methods: {
        'ui.closePanel': async () => {
          opts.close();
          return {};
        }
      }
    });
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
    return this.attachContext({
      port: this.iframePort(iframe, opts.runtime.url),
      extension: opts.extension,
      context: { kind: 'background', id: opts.runtime.id, instanceId: null },
      stateInstance: null,
      runtime: opts.runtime.id
    });
  }

  /**
   * Attach a window iframe (capability `windows`): one of the extension's
   * panels shown floating over the chart. Same host API surface as a panel,
   * except that it closes itself with `ui.closeWindow` (no `ui.closePanel`).
   * It has no widget instance, so `state.*` defaults to the extension scope.
   */
  attachWindow(iframe: HTMLIFrameElement, w: ExtWindow): () => void {
    return this.attachContext({
      port: this.iframePort(iframe, w.panel.url ?? ''),
      extension: w.extension,
      context: {
        kind: 'window',
        id: w.panel.id,
        instanceId: null,
        windowId: w.id,
        params: w.params,
        ...(w.invocation ? { invocation: w.invocation } : {})
      },
      stateInstance: null
    });
  }

  /**
   * Reverse embedding: when Freeboard is itself running inside another
   * application's iframe (an "embedding host", e.g. KIP), expose the full host
   * API to that parent over the same bus. Freeboard stays the API host but
   * points its port at `window.parent`; the embedding host is the caller and
   * initiates the handshake. The origin is pinned to Freeboard's own origin, so
   * only a same-origin embedder — already sharing the user's session — is
   * served; a cross-origin embedder is refused (see the API spec, *Embedding
   * Hosts*). The caller's asserted id is adopted as the handshake `context.id`;
   * `state.*` stays under a single `embedding-host` scope (one embedder per
   * server in practice).
   */
  attachEmbeddingHost(
    port: BusPort = windowPort(window.parent, {
      origin: window.location.origin
    })
  ): () => void {
    return this.attachContext({
      port,
      extension: EMBEDDING_HOST_ID,
      context: {
        kind: 'embedding-host',
        id: EMBEDDING_HOST_ID,
        instanceId: null
      },
      stateInstance: null,
      adoptCallerId: true
    });
  }

  /**
   * Stand up the embedding-host connection once, only when Freeboard is embedded
   * in a parent frame. Idempotent — `init()` may run several times (e.g. a
   * re-discovery after authentication).
   */
  private attachEmbeddingHostOnce(): void {
    if (this.embeddingHostDetach || this.app.isTopWindow()) return;
    this.embeddingHostDetach = this.attachEmbeddingHost();
  }

  private detach(ctx: LiveContext) {
    if (!this.contexts.has(ctx)) return;
    this.contexts.delete(ctx);
    // A context that unloads ends its pick, without an event.
    if (this.pickOwner?.ctx === ctx) {
      this.mapInteract.endPick(this.pickOwner.pickId, null);
    }
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

  /**
   * Configuration panels loaded in an open dialog, for `panels.state`. A list,
   * not one slot: an extension can open a second widget's dialog over the
   * first, and each must report its own close. Each targets either a widget
   * instance or an image overlay.
   */
  private readonly configPanels = signal<
    Array<{
      id: number;
      extension: string;
      panel: string;
      targetInstance?: string;
      targetOverlay?: string;
    }>
  >([]);
  private configPanelSeq = 0;
  /** Overlay keys whose configuration dialog is opening or open. */
  private readonly overlayConfigsOpen = new Set<string>();

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
      // A dialog without an iframe panel (remove-only) loads no panel.
      const configId = panel ? ++this.configPanelSeq : null;
      if (panel && configId !== null) {
        this.configPanels.update((list) => [
          ...list,
          {
            id: configId,
            extension: placed.extension,
            panel: panel.id,
            targetInstance: placed.instanceId
          }
        ]);
      }
      ref.afterClosed().subscribe(() => {
        if (this.configDialogRef === ref) {
          this.configDialogRef = null;
          this.configDialogInstance = null;
        }
        if (configId !== null) {
          this.configPanels.update((list) =>
            list.filter((c) => c.id !== configId)
          );
        }
      });
    });
  }

  /**
   * Open an image overlay's configuration panel (its `configPanel`, already
   * resolved to a usable iframe panel by the registry) in the same dialog as a
   * widget's, without the Remove button: an overlay is hidden, never removed.
   * A second call while that overlay's dialog is opening or open does
   * nothing: the dialog loads after a lazy import, so a double tap would
   * otherwise stack two dialogs.
   */
  openOverlayConfigPanel(entry: OverlayEntry) {
    if (this.overlayConfigsOpen.has(entry.key)) return;
    const panel =
      entry.configPanel && this.iframePanel(entry.extension, entry.configPanel);
    if (!panel) return;
    this.overlayConfigsOpen.add(entry.key);
    const release = () => this.overlayConfigsOpen.delete(entry.key);
    import('./panel-dialog.component').then(({ PlotterPanelDialog }) => {
      const ref = this.dialog.open(PlotterPanelDialog, {
        data: {
          extension: entry.extension,
          panel,
          title: entry.title,
          targetOverlay: entry.id
        },
        width: '440px',
        maxHeight: '85vh'
      });
      const configId = ++this.configPanelSeq;
      this.configPanels.update((list) => [
        ...list,
        {
          id: configId,
          extension: entry.extension,
          panel: panel.id,
          targetOverlay: entry.id
        }
      ]);
      ref.afterClosed().subscribe(() => {
        release();
        this.configPanels.update((list) =>
          list.filter((c) => c.id !== configId)
        );
      });
    }, release);
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

  /** Publish to one background runtime of an extension (subscription-gated). */
  private publishToRuntime(
    extension: string,
    runtime: string,
    event: string,
    params: unknown
  ) {
    for (const ctx of this.contexts) {
      if (ctx.extension === extension && ctx.runtime === runtime) {
        ctx.conn.publish(event, params);
      }
    }
  }

  /**
   * Broadcast a custom event to every live extension context (any extension).
   * Like publishToExtension, delivery is subscription-gated — publish() only
   * reaches a context that subscribed to the topic — so this is a shared,
   * opt-in message bus, not a spam channel. It is the `scope: 'all'` route for
   * `events.publish` and `publish`/`sendMessage` buttons; the cross-extension
   * reach is what lets a federation of plugins talk over namespaced topics.
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
  // (AppFacade.mapMoveRequest -> AppComponent.applyMapMove -> centerMainChart), not
  // by reaching into the OpenLayers view directly. Driving the OL view
  // directly bypasses Freeboard's mapCenter/mapZoom signal flow, so chart
  // and resource layers do not refresh after the move. They move the main
  // chart even while the split view's second pane is the active one: the API
  // describes that chart's view, and a fit is computed for its size.

  /**
   * The current chart viewport — the single shape shared by `map.getView` and
   * the `map.view` event, so a following extension seeds and updates from
   * identical data. Reads mapExtent() reactively; the effect that emits
   * `map.view` depends on it.
   */
  private mapView(): MapView {
    const extent = this.app.mapExtent();
    return {
      center: this.app.config.map.center as [number, number],
      zoom: this.app.config.map.zoomLevel,
      // OpenLayers' extent runs past ±180 once the view has scrolled round
      // the world; the API reports [west, south, east, north] in range, with
      // west > east across the antimeridian. Only the empty extent before the
      // map's first moveend is not a box; it passes through as before.
      bounds:
        normalizeBounds(extent) ?? (extent as [number, number, number, number])
    };
  }

  /** Last viewport broadcast, for de-duping `map.view`. */
  private prevMapView: MapView | null = null;

  /**
   * Broadcast `map.view` when the viewport actually moved. Seeds silently on the
   * first run (matching the chart/night-mode event pattern). mapExtent is
   * re-assigned on every OL moveend even when the view came back to where it
   * started, so compare values rather than trusting the signal to have changed.
   */
  private emitMapViewChange(view: MapView): void {
    const prev = this.prevMapView;
    this.prevMapView = view;
    if (prev === null) {
      return;
    }
    const same =
      prev.zoom === view.zoom &&
      prev.center[0] === view.center[0] &&
      prev.center[1] === view.center[1] &&
      prev.bounds.length === view.bounds.length &&
      prev.bounds.every((v, i) => v === view.bounds[i]);
    if (same) {
      return;
    }
    this.broadcastMessage('map.view', view);
  }

  private mapMethods(): Record<string, MethodHandler> {
    return {
      'map.getView': async () => this.mapView(),
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
        // the API's form (west > east across the antimeridian) or a map
        // engine's unwrapped one (east past 180) — both are the same box
        const box = normalizeBounds((params as { bounds?: unknown })?.bounds);
        if (!box) {
          throw new RpcError(
            'map.fitBounds requires bounds [west, south, east, north]',
            { code: RPC_ERRORS.INVALID_PARAMS, reason: 'INVALID_BOUNDS' }
          );
        }
        this.app.mapMoveRequest.set(this.fitView(box));
        return {};
      }
    };
  }

  /**
   * The centre and zoom that frame a box in the current map (read-only use of
   * the OL map): centred on its Web Mercator middle, the short way round the
   * antimeridian, and fitted as it lies on a rotated (heading-up) map with a
   * margin so markers aren't at the edge. Falls back to a reasonable zoom when
   * the map is unavailable.
   */
  private fitView(box: LonLatBox): { center: Position; zoom: number } {
    const map = this.mapService.getMaps()[0];
    const size = map?.getSize();
    const limits = {
      min: this.app.MAP_ZOOM_EXTENT?.min ?? 0,
      max: Math.min(this.app.MAP_ZOOM_EXTENT?.max ?? 18, FIT_MAX_ZOOM)
    };
    if (!map || !size) {
      return { center: fitBbox(box, [1, 1], limits).center, zoom: 12 };
    }
    return fitBbox(
      box,
      [size[0], size[1]],
      limits,
      map.getView().getRotation()
    );
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
