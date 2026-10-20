# Freeboard-SK: Plotter Extension Host Support

Freeboard-SK is the **reference host** for the Signal K *Plotter Extensions API* —
the mechanism by which a Signal K server plugin contributes UI (panels, widgets,
buttons) and behaviour into a chartplotter web app through sandboxed iframes that
talk to the host over a small JSON-RPC message bus.

This document is an implementation reference for the **host side** in
Freeboard-SK. The host-agnostic contracts it implements live in:

- [`../api/plotter-extensions-api.md`](../api/plotter-extensions-api.md) — the API
  (capabilities, methods, events) any conforming host exposes.
- [`../api/plotter_extension_provider_plugins.md`](../api/plotter_extension_provider_plugins.md)
  — the "using the APIs" guide for plugin authors who *provide* extensions.

The wire contract (the JSON-RPC-over-`postMessage` bus) is the
[`signalk-plotterext-bus`](https://www.npmjs.com/package/signalk-plotterext-bus)
package; Freeboard depends on it (`^0.23.0`) and imports its host entry point
(`signalk-plotterext-bus/host`).

## How the host works

- **Discovery.** Extensions are advertised as `plotterExtensions` resources
  (`/signalk/v2/api/resources/plotterExtensions`). `PlotterExtensionService`
  reads the manifests, keeps the compatible ones, and drives the UI from them.
- **One connection per context.** Each live extension iframe (panel, widget, or a
  headless background runtime) gets its own `HostConnection` over a
  `windowPort`. The host answers the extension's method calls and relays events
  the extension has subscribed to.
- **No host-side enable/disable.** Extension availability is controlled entirely
  on the server (plugin install + enable). Presence in the `plotterExtensions`
  collection is the enablement signal.
- **Capability negotiation.** The host advertises `HOST_API_VERSION = '1'` and a
  `HOST_CAPABILITIES` set; an extension declares what it `requires` and the host
  only mounts it when compatible.

### Capabilities Freeboard advertises (`HOST_CAPABILITIES`)

`widgets`, `panels.iframe`, `panels.state`, `buttons`, `events.publish`, `signalk.stream`,
`signalk.put`, `units`,
`map`, `resources`, `resources.filter`, `routes`, `charts`, `charts.time`,
`nightMode`, `resourceGroups`, `background.iframe`, `ui`, `windows`,
`overlays.image`, `overlays.data`, `actions`, `map.pick`.

(The authoritative list is `HOST_CAPABILITIES` in
`src/app/modules/plotterext/types.ts`.)

### Embedding hosts (reverse embedding)

Freeboard can also run **inside** another application's iframe (an *embedding
host*, e.g. KIP) and expose the same host API to that parent — the reverse of the
usual topology. See the API spec's *Embedding Hosts* section for the contract.

- `PlotterExtensionService.attachEmbeddingHost()` registers one `HostConnection`
  whose `windowPort` targets `window.parent`, with the full method set and a
  `kind: 'embedding-host'` context. `init()` calls it once, only when embedded
  (`!app.isTopWindow()`). Freeboard only stands up the endpoint — the **embedding
  application initiates** the handshake by calling `connectExtension` from the
  parent frame.
- **Same-origin only.** The port pins the origin to Freeboard's own
  (`window.location.origin`) — a cross-origin embedder is refused. A same-origin
  embedder already shares the user's session, so this grants no new authority.
- **Caller identity.** `adoptCallerId: true` adopts the id the embedder asserts in
  `bus.ready` as the handshake `context.id`; `state.*` stays under a single
  `embedding-host` scope (one embedder per server in practice).
- The legacy parent-`postMessage` night-mode bridge in `app.facade.ts`
  (`parseMessageFromParent`) is retained for backward compatibility.

## The `events.publish` capability

`events.publish` lets an extension context publish an event of its own onto the
bus, and the `publish` toolbar button action (deprecated alias `sendMessage`) is
the same operation triggered by the user. See the API spec's *Publishing events*.

### Delivery

Freeboard already had both routes a published event needs, the same ones its own
host events use. Both are subscription-gated through `HostConnection.publish()`:

- **`scope: "all"`** (default) → `broadcastMessage()`, every live context in any
  extension, the embedding host included.
- **`scope: "extension"`** → `publishToExtension()`, the contexts whose
  `extension` is the publisher's. The embedding host is its own extension
  (`embedding-host`).

The publisher receives its own event if it subscribed, and nothing marks the
event as extension-published. Validation (`*`, `bus.*`, scope) is the bus's
`parsePublishParams()`, so it matches every other host.

### Methods and buttons

The handler is a pure factory (`events-methods.ts`), spread into every context's
method table with the context's extension. Its `publishEvent()` is also what
`handleButtonAction` calls for a `publish` or `sendMessage` button, on behalf of
the button's extension. A button with an invalid `topic` or `scope` is logged
with `console.warn` and does nothing; a button press never throws.

### Error reasons

`events.badRequest` (missing or empty `topic`, a `topic` containing `*` or in
the `bus.*` namespace, an unknown `scope`).

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/events-methods.ts` | the `events.publish` handler and `publishEvent()` routing |
| `src/app/modules/plotterext/plotterext.service.ts` | binds it (`eventsDeps`), `broadcastMessage` / `publishToExtension`, the `publish` / `sendMessage` button |

## The `routes` capability

`routes` lets an extension create and edit routes on the chart — e.g. an
auto-router that reshapes a drawn route around land. Freeboard is both the
reference host for the capability and a first-class user of the underlying model
in its own native route UI.

### The visible-route model

Routes the user is working with live in an in-memory **visible set**, managed by
`RouteBufferRegistry`. A route in the set is addressed by an opaque `routeId` and
carries two flags:

- **`saved`** — backed by a stored `routes` resource on the server.
- **`dirty`** — has edits not yet persisted.

So a route is one of: an unsaved **draft** (`saved:false`), a clean mirror of a
stored route (`saved:true, dirty:false`), or a stored route with pending edits
(`saved:true, dirty:true`).

### Methods

`route.list`, `route.create` (≥2 points), `route.show(ref)`, `route.get`,
`route.replace(routeId, points)`, `route.save(routeId, {name?, description?,
dialog?})`, `route.hide`, `route.delete`. Geometry is always edited **whole**
(`route.replace`) — there is no per-point CRUD; routes are small and the host's
native editing yields whole coordinate arrays, so whole-replace is the practical
shape (see the API spec for the rationale).

### Events (`route.**`)

`route.visible`, `route.dirty`, `route.saved`, `route.hidden`. **`route.dirty` is
the conformance floor**: every content change emits it, so a follower can stay in
sync with a single "on `route.dirty`, re-`route.get`" loop without tracking who
changed what. Events fire for *every* change regardless of origin — an extension
command, the user's native editing, or another extension.

### Error reasons

Failures reject with a stable `error.data.reason`: `routes.unknownId`,
`routes.badRequest`, `routes.badRef`, `routes.saveFailed` (server rejected a
persist — distinct from the user-cancel `routes.saveCancelled`),
`routes.deleteFailed`, `routes.notSupported`.

### The Freeboard route UX built on this

- Drawing a route creates an editable **amber draft** you review/adjust on the
  chart before saving, instead of going straight to a save dialog.
- **Tap-to-edit** a live route; the route popover and info panel offer **Save /
  Edit / Delete** consistently (drafts get a quick Delete/discard; server-backed
  actions like Start / Route Points / Show Notes are hidden for unsaved drafts).
- Saving keeps the route on the map (it isn't consumed), and per-point
  names/descriptions, waypoint links (`href`) and the route description
  round-trip through save. Every saved point carries a `name` (`''` when
  unnamed), and moving a linked point off its waypoint in the native editor
  drops its link.
- Freeboard mirrors its own displayed/edited routes into the visible set, so
  extensions observe native edits as `route.*` events too.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/plotterext.service.ts` | host service: discovery, per-iframe `HostConnection`, method dispatch, event bridging |
| `src/app/modules/plotterext/route-buffer.registry.ts` | the `routeId → buffer` visible-set registry (`saved`/`dirty`/`rev`, events) |
| `src/app/modules/plotterext/route-methods.ts` | the `route.*` method handlers + param validation |
| `src/app/modules/plotterext/types.ts` | `HOST_API_VERSION`, `HOST_CAPABILITIES`, manifest types |
| `src/app/modules/map/fb-map.component.ts` + `app.component.ts` | native route draw/modify/delete bridged into the registry |

## The `charts` capability

`charts` is a lightweight facade over the chart layers Freeboard **already
manages** — the same charts the user turns on and off in the chart controls. An
extension enumerates them and changes visibility, opacity and stacking order. It
is deliberately **not** a chart provider: no create, add, import or delete.

### The chart model

Freeboard's charts come from the server `charts` resource plus the built-in
OpenStreetMap / OpenSeaMap defaults. The displayed set is `SKResourceService`'s
`charts()` signal (bottom-first render order); which charts are on is stored in
`app.config.selections.charts` (an explicit id list, or `null` = "show all"),
their stacking in `selections.chartOrder`, and per-chart opacity in
`selections.chartOpacity`. Each chart is addressed by an **opaque `id`**.

### Methods

`chart.list`, `chart.setVisibility({ids, visible})`,
`chart.setOpacity({ids, opacity})`, `chart.setOrder({order})`. All mutators are
**batch** (take a set of ids). `chart.list` returns the full available set
(visible **and** available-but-off charts, each with a `visible` flag) in display
order, **topmost first** — so it doubles as the way to read the current order.
The handlers are a pure factory (`chart-methods.ts`) over accessors the service
binds to `SKResourceService`.

### Events (`chart.**`)

`chart.visibility` (`{id, visible}`), `chart.opacity` (`{id, opacity}`),
`chart.order` (`{order}`). Emitted for **every** change regardless of origin — an
extension command *or* the user's own chart controls — by diffing successive
`charts()` emissions in an Angular `effect`. A batch `chart.setVisibility` emits
one `chart.visibility` per *changed* chart. `chart.order` carries the topmost-first
order of the **displayed** charts (hidden charts have no stacking position);
re-read `chart.list` for the full snapshot.

### Freeboard specifics

- **`chart.setOrder` is host-clamped.** OpenStreetMap sits at the bottom and the
  reorder applies to the rendered (visible) charts; the request expresses relative
  intent and the resulting order is whatever the next `chart.list` reports.
- **Show-all vs. explicit set.** When no chart has been deselected, Freeboard runs
  in "show all" mode (`selections.charts === null`); hiding a chart materialises
  the explicit selection, and showing the last missing one returns to show-all —
  matching the native chart list's behaviour so extension and user stay in sync.
- **Opacity persists.** `chart.setOpacity` writes `selections.chartOpacity` so the
  value survives a refresh and applies when a currently-hidden chart is shown.

### Error reasons

`charts.unknownId` (a supplied id names no managed chart), `charts.badRequest`
(malformed params — e.g. a non-array `ids`, non-boolean `visible`, or out-of-range
`opacity`), `charts.notSupported`.

### `charts.time` — retargeting a time-varying chart

Freeboard advertises the `charts.time` sub-capability. A chart is
**time-addressable** when its resource carries the `time` block from the
contract's chart-resource convention (or, for a WMS/WMTS chart added through
Freeboard's own dialogs, when the service's capabilities advertised a time
dimension — persisted into the resource at layer selection) *and* it renders as a
raster layer (tilelayer, tileJSON, WMS, WMTS); a vector chart never is. Such a
chart's `chart.list` entry carries `time: { value, current, from?, to?, step?,
values? }`; every other chart omits it.

`chart.setTime({ ids, time })` shows each chart at an ISO 8601 instant, or its
newest frame for `null` (the live frame where the source serves one; on an
archival source, `current: false`, the newest frame at or before now, which the
layer resolves as it requests it and again on each refresh tick). The instant is
**passed through unchanged** to the tile
source — no snapping to `values`, no clamping to `from`/`to` — so an extension
animating a provider it does not own should pick from the timeline it is given.
It is the same call the native **Time** palette (the clock action on a chart-list
row) makes; the two stay in sync through the chart cache.

- **Session state.** The shown instant lives on the cached chart (`timeValue`),
  never in the saved config and never in the chart resource sent to the server;
  every chart starts on its newest frame (`null`) on load. An explicit instant
  stays where it is put -- a refresh tick re-reads the chart's timeline but never
  moves the selection -- until another `chart.setTime`, or the native Time
  palette closing, which returns the chart to `null`.
- **Non-destructive swap.** The layer rotates the tile source's key rather than
  refreshing it, so the previous frame stays on screen until the requested one has
  loaded — the same path `refreshInterval` uses.
- **`refreshInterval` interplay.** A chart's auto-refresh timer is suspended while
  `time` is non-null (a historical frame does not change) and resumes on return
  to `null`; on an archival source each tick re-resolves which frame is newest.

`chart.time` (`{id, time}`) is emitted for every retarget, from any origin — an
extension's `chart.setTime`, another extension's, or the user's palette — one
event per *changed* chart. Error reasons add `charts.notTemporal` (an id names a
managed chart with no time dimension); a `time` that is neither `null` nor a
parseable instant is `charts.badRequest`.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/chart-methods.ts` | the `chart.*` handlers + param validation + `FBChart`→`ChartLayer` mapping |
| `src/app/modules/plotterext/plotterext.service.ts` | binds the handlers to the service and emits `chart.*` events (`emitChartChanges`) |
| `src/app/modules/skresources/resources.service.ts` | `chartsForHostApi` / `setChartsVisibility` / `setChartsOpacity` / `setChartsOrder` / `setChartsTime` / `chartIsTemporal` |
| `src/app/lib/chart-time.ts`, `src/app/modules/map/ol/lib/charts/chart-utils.ts` | the time model (timeline, instants) and how an instant is applied to each OpenLayers source |

## The `nightMode` capability

`nightMode` lets an extension read and control Freeboard's night-vision display
mode — the dimmed low-light appearance the user toggles from the display settings
or that tracks the server's `environment.mode`. It exists so an embedded panel
(e.g. an instrument gauge) can match the host instead of glowing white on a dark
bridge, and it is the first step in moving the bespoke KIP integration onto the
standard API.

### The night-mode model

The applied night state (the `app-night` class) is
`stream.selfNightMode() || uiCtrl().forceNightMode`: the **auto** path
(`config.display.nightMode`, the "Auto-set Night Mode" setting) turns night on when
`environment.mode === 'night'`, and the **force** path (`uiCtrl().forceNightMode`)
is a manual override. The capability maps these to `{ enabled, auto }`:

- **`enabled`** — the resolved applied state (`selfNightMode() || forceNightMode`).
- **`auto`** — the "Auto-set Night Mode" setting (`config.display.nightMode`).

### Methods

`nightMode.get` → `{ enabled, auto }`; `nightMode.set({ enabled?, auto? })`. The
three effective requests: force on (`{enabled:true}`), force off
(`{enabled:false}`), follow the server (`{auto:true}`). Setting `enabled` is a
manual override — it clears `auto`; setting `{auto:true}` clears any manual force
so the state purely tracks `environment.mode`. `applyNightMode` calls
`SKStreamFacade.refreshSelfNightMode()` so an `auto` change takes effect
immediately rather than on the next delta. The handlers are a pure factory
(`nightmode-methods.ts`) over service accessors.

### Events (`nightMode.changed`)

`nightMode.changed` (`{ enabled, auto }`) is emitted for **every** change
regardless of origin — a host `nightMode.set`, the user's own display setting, or
the server's `environment.mode` flipping while `auto` is on. A reactive `effect`
covers server/force-driven changes; `applyNightMode` also emits directly so an
`auto`-only change (which may not move the resolved state) is not missed.
`emitNightModeChange` de-dupes so each real change fires exactly once.

### Error reasons

`nightMode.badRequest` (malformed params — a non-boolean `enabled`/`auto`, or
neither field present), `nightMode.notSupported`.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/nightmode-methods.ts` | the `nightMode.*` handlers + param validation |
| `src/app/modules/plotterext/plotterext.service.ts` | binds the handlers (`readNightMode`/`applyNightMode`) and emits `nightMode.changed` (`emitNightModeChange`) |
| `src/app/modules/skstream/skstream.facade.ts` | `selfNightMode` signal + `refreshSelfNightMode()` |

## The `panels.state` capability

`panels.state` lets an extension follow whether each of its loaded panels is on
screen: `ui.listPanels` returns them, and the `panel.state` event reports each
change. Its first user is a `keepAlive` panel hosting webapps that must unload
the moment the panel leaves the screen. See the API spec's *Panel state*.

### What counts as visible in Freeboard

- **Drawer panels.** The drawer shows one panel at a time; a panel is `visible`
  while it is that one. A `keepAlive` panel that was closed or switched away from
  stays loaded and is listed with `visible: false`. An `onOpen` panel is
  destroyed when hidden, so it leaves the list.
- **Configuration panels.** Visible while their dialog is open, with
  `targetInstance` set to the widget instance being configured, or
  `targetOverlay` to the image overlay being configured. Closing the
  dialog unloads the panel. A dialog for a widget with no usable config panel
  (the remove-only dialog) loads no panel and is not listed.
- **`collapsed` is always `false`.** Freeboard has no panel collapse.
- **Windows are not panels here.** A panel shown in a window is a `window`
  context, reported by `ui.listWindows` / `window.state`.
- **The embedding host** has no manifest, so its list is always empty.

### Methods and events

`ui.listPanels` → `{ panels }` is in every context's method table (beside
`ui.openPanel` / `ui.togglePanel`) and is built from one `panelStates` computed
over the drawer registry (`openPanels`) and the open config dialogs
(`configPanels`).

`panel.state` comes from an `effect` on that computed, which diffs it against
the last reported states (`emitPanelStates`). Because it watches the registry
rather than the code paths that change it, every origin is covered: the drawer's
close button, a panel switch, a toolbar button, and any extension's `ui.*` call.
It is sent with `publishToExtension`, so only the owning extension's subscribed
contexts receive it. Details:

- **Transitions only.** A panel whose `visible` did not change sends nothing,
  and changes inside one effect run collapse to their net result: a panel opened
  and replaced before the effect runs sends nothing for the first panel.
- **Hides before shows.** A switch reports the old panel hidden before the new
  one shown.
- **Unloading while visible** (an `onOpen` panel replaced or closed, a config
  dialog closed) reports `visible: false` to the extension's other contexts.

### Error reasons

None in Freeboard. `ui.listPanels` takes no parameters and cannot fail, and
`panels.notSupported` is the spec's reason for a host without the capability.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/plotterext.service.ts` | `panelStates`, `listPanels`, `emitPanelStates`, the `ui.listPanels` handler, `configPanels` tracking in `openConfigPanel` |
| `src/app/modules/plotterext/plotterext.panel-state.spec.ts` | the capability end to end over real bus clients |

## The `windows` capability

`windows` shows an extension's iframe panels as windows floating over the chart
(spec: *Windows* in the API doc). The frame — move and resize from eight
handles, collapse, opacity, an auto-hiding title bar — came from Karl-Erik
Gustafsson's PiP App work (#913) and lives in `src/app/modules/plotterext/windows/`.

### The window model

`ExtWindowService` is the store: the open windows (`ExtWindow`), their stacking
order and the **window area** they float in. Windows exist only for the life of
the page and are never written to `config`; an extension that wants its windows
back after a reload opens them again (typically from a background runtime).

- **Geometry is the spec's request**, kept as given (`anchor` + inward `offset`,
  px or `%` sizes, min/max) and re-resolved by `resolveGeometry` whenever the
  window or the area changes, so an anchored window keeps its place. A user move
  or resize is turned back into a request anchored to the nearest edges
  (`anchoredGeometry`).
- **Presentation.** Every non-modal window floats at every area size, so on a
  phone too the user can move and resize it and its title bar can auto-hide.
  A window whose requested size (with the host minimum applied) does not fit
  the area (`fitsArea`) is drawn shrunk to fit with its shape kept, the way a
  picture-in-picture video scales (`resolveGeometry`): a 480×360 window on a
  390 px-wide phone is drawn 390×293, not squashed to 390×360. The request
  itself is kept, so the window grows back on a larger area or after a
  rotation; a user move or resize there stores the new size as usual. Freeboard
  never uses `sheet`. Only a modal window that does not fit an area narrower
  than `MODAL_FULLSCREEN_BREAKPOINT` (600 px) goes `fullscreen`, as a dialog
  would; the choice is re-made whenever the area changes.
- **Ownership.** A window belongs to its extension (`ExtWindow.extension`): any
  of the extension's contexts can manage it, and no other extension can see it.
  When an extension leaves the collection its windows close without an event
  (`syncWindows`); a window whose panel left the manifest closes with reason
  `host`.
- **The user's control.** The title bar and its close control are Freeboard's,
  so any window on screen can be closed from its own frame, whatever its
  extension does; `userClose: 'hide'` turns the control into a hide. Escape
  closes the active modal window. A hidden window has no frame to close, and
  Freeboard has no list of windows: bringing it back is the extension's job
  (spec *Hidden windows*). So that hidden windows nobody returns to cannot use
  up `MAX_WINDOWS`, opening a window at the limit first closes the oldest
  hidden one (reason `host`).
- **Remembered geometry** (`restoreKey`) is stored per device in localStorage
  (`fb-plotterext-windows`), not in the synced config: a layout that suits a
  laptop rarely suits a phone.

### Layering

The window layer (`fb-pe-window-layer`) is absolutely positioned inside the
chart's `mat-sidenav-content`, so the **window area is the chart area**: it
excludes the extension panel drawer, and whenever Freeboard shows its controls
(not kiosk mode) it is inset 54 px left and right, clear of the toolbar columns
(`fb-map-toolbar`, z-index 4800). Inside the chart's stacking context the layer
sits at z-index 4850, above the map, and **below** the map buttons, nav data,
alarm/bottom-sheet (4902), FAB (5000) and alert list (6100). So no window, sheet
or modal backdrop can cover the toolbars (including the Alarms button) or the
alarm UI: the spec's rule that host safety UI stays above and usable with every
extension window, modal ones included. Windows stack at even z-indexes within the layer,
leaving the odd one below the active modal window for its backdrop.

The widget overlay's press-and-hold handler ignores presses on `.fb-pe-window`
and `.fb-pe-window-backdrop`, and while a window is moved or resized
`body.fb-pe-window-gesture` stops every iframe taking the pointer
(`styles.scss`).

### Methods, events, buttons

The `ui.*Window` handlers are a pure factory (`window-methods.ts`) added to
every context's shared method table; a `window` context gets the panel surface
minus `ui.closePanel`, and a left-out `windowId` addresses the calling window.
`attachWindow` connects a window's iframe as a `window` context carrying its
`windowId` and `params`. `window.bounds` / `window.state` / `window.closed` come
from `ExtWindowService.changes` and go to the owning extension only
(`publishToExtension`). `openWindow` / `toggleWindow` button actions take the
same options as `ui.openWindow`; each button remembers the window it opened.

### Error reasons

`windows.badRequest`, `UNKNOWN_PANEL`, `windows.unknownId`, `windows.limit`
(`MAX_WINDOWS` = 12 across all extensions, and none hidden to reclaim),
`windows.modalOpen`.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/window-methods.ts` | the `ui.*Window` handlers + param validation |
| `src/app/modules/plotterext/plotterext.service.ts` | `windowMethods`, `attachWindow`, window buttons, `syncWindows`, event relay |
| `src/app/modules/plotterext/windows/window.service.ts` | the window store, presentation, events, remembered geometry |
| `src/app/modules/plotterext/windows/geometry.ts` | request resolution, gestures, clamping, snapping |
| `src/app/modules/plotterext/windows/window.component.ts` | one window: title bar, gestures, the bus-connected iframe |
| `src/app/modules/plotterext/windows/window-layer.component.ts` | the window area, modal backdrop, Escape |
| `dev-tools/fsk-mcp/src/tools.ts` | `fsk_open_window` / `fsk_update_window` / `fsk_list_windows` / `fsk_close_window` |

## The `resourceGroups` capability

`resourceGroups` lets an extension apply a stored resource group — the same
action as checking a group in Freeboard's Resource Groups list. Group CRUD is not
part of it: groups are ordinary resources in the server's `groups` collection, and
extensions create, edit and list them through the resources API.

### The group model

Applying a group overwrites `config.selections.{routes,waypoints,regions,charts}`
with the group's lists, then refreshes those layers and saves the config. A list
that is present replaces that type's selection (`[]` empties it, hiding the type);
an absent list leaves the type untouched. That is exactly the contract's
three-way rule, so Freeboard acts on every type present in the group and reports
all of them in `applied`. Ids that name no resource are simply never drawn.

Both paths go through one method, `SKResourceGroupService.applyGroup()`: the
Resource Groups checkbox (`grouplist.ts`) and the host method. The pure selection
logic lives in `group-apply.ts` (`applyGroupToSelections`, `isValidGroup`).

A group Freeboard creates is saved with `routes`, `waypoints` and `regions` set to
`[]` (the dialog's *Hide* boxes default to checked) and no `charts` key, so
applying a fresh group hides those three types and leaves the charts alone.
Unchecking *Hide* in the group dialog removes that key.

### Methods

`resourceGroup.apply({ id })` → `{ applied }`. The handler fetches
`/resources/groups/{id}`, validates the document, and applies it. The handlers are
a pure factory (`resourcegroup-methods.ts`) over the group service.

### Events (`resourceGroup.applied`)

`resourceGroup.applied` (`{ id, applied }`) is emitted for **every** apply —
an extension's `resourceGroup.apply` or the user checking a group — via the
group service's `applied$` stream, which the host relays. The chart and route
changes an apply causes also arrive as the usual `chart.*` / `route.*` events,
since those are derived from the displayed state.

### Error reasons

`resourceGroups.unknownId` (the server answered 404 — no such group, or no
`groups` collection), `resourceGroups.fetchFailed` (any other fetch failure),
`resourceGroups.badRequest` (a missing or non-string `id`, or a group whose lists
are not arrays of strings), `resourceGroups.notSupported`.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/resourcegroup-methods.ts` | the `resourceGroup.apply` handler + param/document validation + error mapping |
| `src/app/modules/plotterext/plotterext.service.ts` | binds the handler and relays `applied$` as `resourceGroup.applied` |
| `src/app/modules/skresources/components/groups/groups.service.ts` | `applyGroup()` — the shared apply path — and the `applied$` stream |
| `src/app/modules/skresources/components/groups/group-apply.ts` | the pure three-way selection logic and document validation |

## The `map` capability

`map` exposes the chart viewport: `map.getView` reads it, `map.center` /
`map.fitBounds` drive it, and `map.view` follows it. With the split view open
(an experiment) that is the main chart's viewport: the second pane's view is
not exposed, and moves never go to it. The host's map handlers take
`MapService.getMaps()[0]` as the main chart; the second pane registers as
`secondary` (`MapService.addMap`), which keeps it after the main chart.

Moves are routed through Freeboard's own centering path
(`AppFacade.mapMoveRequest` → `AppComponent.applyMapMove` → `centerMainChart`), never by
reaching into the OpenLayers view directly — driving the OL view bypasses the
`mapCenter`/`mapZoom` signal flow, so chart and resource layers would not refresh
after the move.

Boxes follow the spec's *Bounding boxes* convention — `[west, south, east,
north]`, longitudes in `[-180, 180]`, `west > east` across the antimeridian. Two
places enforce it, because OpenLayers pans round the world without limit and its
extents run past ±180:

- **Reporting** — `mapView()` passes `app.mapExtent()` (the OL extent transformed
  to EPSG:4326) through the bus's `normalizeBounds`, which wraps each longitude
  into range. `chart.list` normalises each chart's stored `bounds` the same way,
  omitting one that is not a box.
- **Fitting** — `map.fitBounds` accepts either form via `normalizeBounds`
  (rejecting a non-box with `INVALID_BOUNDS`) and computes the move with
  `fitBbox` (`src/app/lib/map-fit.ts`, shared with the Track history window's
  zoom-to-track): the box's Web Mercator middle, the short way round the
  antimeridian, fitted as it lies on a rotated (heading-up) map, and zoomed no
  deeper than `FIT_MAX_ZOOM` (16) so a single-point box doesn't land far past any
  chart's detail.

### Events (`map.view`)

`map.view` (`{ center, zoom, bounds }`) is emitted for **every** settled viewport
change regardless of origin — the user panning/zooming, Freeboard recentring on
the vessel, or an extension's own `map.center` / `map.fitBounds`. The seam is
`fb-map.component.ts`'s `onMapMoveEnd`, the OpenLayers `moveend` handler, which
writes `config.map.center`, `config.map.zoomLevel` and the `mapExtent` signal; a
reactive `effect` on `mapExtent` therefore fires once per settled move rather than
per frame. `mapView()` builds the payload so the event and `map.getView` provably
share one shape, and `emitMapViewChange` de-dupes — OL hands over a fresh extent
array on every `moveend`, so an unchanged view still re-assigns the signal and the
comparison must be by value.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/plotterext.service.ts` | the `map.*` handlers, `mapView()`, and `map.view` emission (`emitMapViewChange`) |
| `src/app/modules/map/fb-map.component.ts` | `onMapMoveEnd` — the OL `moveend` seam that updates the view state |
| `src/app/lib/map-fit.ts` | `fitBbox` — the centre and zoom `map.fitBounds` moves to |

## The `overlays.image` capability

`overlays.image` lets an extension's background runtime draw a map layer that
Freeboard composites with its own. Freeboard owns where it sits, when a frame is
needed, and the memory budget; the runtime only turns its data into a picture of
the box it is asked for.

### Overlay model

`OverlayRegistry` (a dependency-free root service) holds every overlay of the
collection, keyed `<extension>/<overlay id>`, with the user's show/fade choices,
the active-overlay budget and the frame bookkeeping. `PlotterExtensionService`
feeds it the manifest definitions — an image overlay is kept only when its
`runtime` names one of the same manifest's background runtimes (data overlays:
see *The `overlays.data` capability*) — and saves the user's choices in `config.plotterExtensions.overlays`. Manifest
`visible` / `opacity` apply until the user changes them.

- **Placement.** Bands map to z-indices: `aboveCharts` from 60 (above charts
  `10+n` and the weather/current layers at 50–56, below radar at 99).
  `aboveResources` is clamped, as the spec allows: Freeboard draws its routes
  (500+) and waypoints (600) *above* its own anchor alarm ring (300),
  own-vessel lines (330–350) and AIS AtoN/base-station targets (200–220), so no
  z-index is both above the former and below the latter. The spec says its rule
  — never cover the vessel, alarm indications or AIS targets — outranks the band
  table, and a host whose stacking can't satisfy both places the overlay lower
  (API spec, *Map overlays → Placement*). So the band sits at 190–199, above
  radar, tracks and resource sets, below everything from AIS targets up. Within a band, manifest order; not re-orderable in v1. With more
  than 50 charts shown, chart z-indices (`10+n`) reach the `aboveCharts` band.
- **Budget.** At most `MAX_ACTIVE_OVERLAYS` (4) shown overlays draw at once; the
  rest are reported `suspended`. A frame is drawn at the overlay's
  `preferredPixelRatio` when it declares one, otherwise the screen's
  `devicePixelRatio`, clamped either way to at most 2, and lower when the box
  would exceed `MAX_OVERLAY_PIXELS` (8 M pixels, about 32 MB) — a rotated view
  or a large screen is drawn below native density rather than risk the iOS
  canvas budget. Live (unrequested) frames are accepted at most every
  `LIVE_FRAME_MIN_INTERVAL_MS` (200 ms) per overlay (`overlays.throttled`), and
  every `overlay.request` states that pace as `liveInterval`.
- **User controls.** The Chart list shows one row per overlay above the chart
  rows (every overlay draws above every chart), with its own *Show in Map*
  checkbox and *Set Opacity* slider. Shown-but-suspended overlays say so. An
  overlay whose `configPanel` names an iframe panel of its manifest (with an
  `apiVersion` this host supports; otherwise it is ignored) also gets a *Layer
  settings* button, which opens that panel in the widget-configuration dialog
  (`openOverlayConfigPanel`) with no *Remove* button. The panel's context has
  `targetOverlay` set and `targetInstance`/`targetWidget` null, and its
  `state.*` defaults to the extension scope.

### The frame cycle

Each shown, unsuspended overlay gets a `<fb-plugin-overlay>` layer
(`layer-plugin-overlay.component.ts`): an OL `ImageLayer` that gets a fresh
static `ImageSource` per accepted frame, whose image is the transferred
`ImageBitmap` itself (no copy). Not the radar pattern of one long-lived source
with a mutable `imageExtent`: a static source computes its resolution once, on
first load, and `refresh()` never reloads it, so a frame drawn at another zoom
would be placed at the old scale. `overlayView()` turns the view into the request: the north-up box
covering the rotated viewport (`View.calculateExtent`), padded by 10% per side
(and at least by how far a corner swings in a 5° turn), moved into the primary
world with the render-space `worldOffset` kept aside, at most one world wide,
clipped to the Mercator latitude limit. On `moveend` and map resize,
`needsNewFrame()` asks for a new frame only when the zoom or map size changed,
the rotation moved past 5°, or the view left the last requested box. A
heading-up chart re-rotates on every heading change and a followed vessel
recentres the map on every fix (see the `moveend` lesson in the lessons log);
inside the box OL just moves and rotates the last frame. The layer gates its
own zoom range (`minZoom` inclusive) rather than using OL's, whose `minZoom` is
exclusive. `requestOverlayFrame()` records it and
emits `overlay.request` to that overlay's runtime only (`publishToRuntime`).

An accepted `overlay.frame` is placed at the frame's extent plus the request's
`worldOffset`, so it lands in the world copy on screen. OL keeps drawing the
previous bitmap until the new source has loaded, so the swap does not flicker;
`FrameBitmaps` keeps the newest bitmap and the one each renderer draws, and
closes the rest, even while the layer is hidden, mid-gesture or in a background
tab, when OL loads nothing. Normally that is one renderer, so at most two
bitmaps. With the split view open the second pane draws the same frames through
a twin of the layer, which the mirror hands to the layer (`ON_TWIN` in
`ol/lib/util.ts`); a twin mid-gesture keeps its bitmap open while the main
chart moves on. Frames are still requested for the main chart's view only, so
on the second pane an overlay covers the area the main chart shows, and no
request is made for a view the chart only passes through while the split's
divider is dragged (`RESIZING`). Refused frames are closed by the registry.
Image sources do not wrap, so at a zoom showing several world copies the overlay
appears in the copy the request was made for.

A background runtime usually loads after the map has asked for its first frame.
When a runtime subscribes to `overlay.request`, the host replays the latest
request of each of its active overlays (`replayOverlayRequests`, deferred one tick
so it arrives after the subscribe call resolves).

### Methods and events

`overlay.list`, `overlay.setVisibility`, `overlay.setOpacity` and `overlay.frame`
are a pure factory (`overlay-methods.ts`) over the registry, scoped to the calling
extension; `overlay.frame` is accepted only from the overlay's own runtime.
`overlay.state` is emitted to the owning extension for every change of
visibility, opacity or suspension, whoever made it (`emitOverlayStates`); the
first report seeds silently.

### Error reasons

`overlays.unknownId` (an id of no overlay of the caller's extension, or a frame
from a context other than the overlay's runtime), `overlays.badRequest` (bad
params, an `image` that is not an `ImageBitmap`, a frame whose size does not
match its request). Refused frames are results: `overlays.superseded` (a newer
request, the overlay hidden or not yet requested) and `overlays.throttled`.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/overlay-registry.ts` | overlay state, budget, z-bands, requests and frame acceptance |
| `src/app/modules/plotterext/overlay-methods.ts` | the `overlay.*` handlers + param validation + error mapping |
| `src/app/modules/plotterext/plotterext.service.ts` | manifest definitions, `requestOverlayFrame`, `overlay.state`, request replay |
| `src/app/modules/map/ol/lib/plugin-overlay/layer-plugin-overlay.component.ts` | the OL layer: requests frames, draws accepted ones |
| `src/app/modules/map/ol/lib/plugin-overlay/frame-bitmaps.ts` | `frameSource()` (a static source per frame) and `FrameBitmaps` (holds the newest bitmap and the one each renderer draws) |
| `src/app/modules/map/ol/lib/plugin-overlay/overlay-geometry.ts` | `overlayView()` / `needsNewFrame()` — request geometry and the re-request rule |
| `src/app/modules/skresources/components/charts/chartlist.html` | the *Plugin layers* rows |

## The `overlays.data` capability

`overlays.data` lets an extension contribute a map layer as data plus a MapLibre
style, which Freeboard draws with its own OpenLayers stack. Everything the image
tier owns that is not about frames is shared: the registry, bands and z-indices,
the budget, persistence, `overlay.list` / `setVisibility` / `setOpacity`,
`overlay.state`, the chart-list rows and the configuration panel. The spec is
*Data overlays* in the API doc; this section is how Freeboard implements it.

### Loading the style

`PlotterExtensionService.overlayDefinitions` accepts `type: "data"` with a `style`
that is the style object or a URL; `runtime` is not used. A URL resolves with
`resolveOverlayUrl` and is fetched once per overlay (`fetchDataStyles`, by an
effect, since a `computed` cannot fetch); the overlay appears when it loads. A
style that cannot be loaded, is refused by the resolver, or fails
`parseOverlayStyle` (not version 8, no `sources` / `layers`, a layer without a
unique string id) omits the overlay with a `console.warn`.

Each data overlay gets a `DataOverlayModel` (`data-overlay-model.ts`), which the
registry entry carries as `model`. The model is kept while the style is
unchanged, so live changes survive a manifest re-read, and it outlives the map
layer, so changes made while the overlay is hidden or suspended take effect when
it is shown again.

### What Freeboard draws (`data-overlay-style.ts`)

`analyzeLayer` decides, per layer, *drawn* or a skip reason, and `overlay.list`
reports the skips as `skippedLayers`. A layer is drawn only when:

- its type is `color-relief`, `raster`, `fill`, `line`, `circle` or `symbol`
  (else `layerType`);
- its source exists, is usable and is the type that layer needs (else
  `source`). Usable means `raster-dem` / `raster` / `vector` with `tiles` (a
  TileJSON `url` and `scheme: "tms"` are refused) whose URLs all resolve the same
  way and use no placeholder but `{z}`, `{x}`, `{y}`, or `geojson` with inline
  data or a resolvable URL (`cluster` and a source `filter` are refused);
- the Style Spec validator (`validateStyleMin`, on a one-layer style with a dummy
  `glyphs`) accepts it, and it uses only properties its drawing path reproduces
  (`DRAWN`), any other at its Style Spec default, and none of the `image`,
  `within` or `distance` operators (else `property`). `text-font` is always
  accepted and ignored.

`color-relief-color` must be a top-level `interpolate` / `linear` / `elevation`
with ascending literal number stops and literal colours (`parseReliefRamp`).
`resampling` is checked by hand: the bundled style-spec (23.3) predates it.

### Source URLs

`resolveOverlayUrl` joins a server-relative path to the Signal K server's origin
(`app.hostDef.url`, else the page's) as text, so `{z}`/`{x}`/`{y}` survive;
`resolveAssetUrl` cannot be reused, since it percent-encodes the braces and
refuses other origins. Server-relative URLs are fetched with `credentials:
'include'`, `https://` URLs with `'omit'`; everything else is refused.

### Drawing (`<fb-data-overlay>`)

`layer-data-overlay.component.ts` mounts next to `<fb-plugin-overlay>` for each
shown, unsuspended data overlay: one OL `LayerGroup` at the overlay's z-index
with its opacity (so the user's fade scales each layer's own opacity) and its
manifest zoom range (inclusive at both ends, as for image overlays). Inside it,
drawn layers become OL layers in style order:

- **`color-relief`** → `WebGLTileLayer` over an `ImageTile` source. The shader
  decodes elevation from the bands (`elevationExpression`: OL bands are 0..1, so
  each Style Spec factor is ×255) and maps it through the ramp as an OL
  `interpolate` (`reliefColorExpression`). The decode is linear in each channel,
  so linear texture filtering interpolates elevation correctly. DEM tiles are
  decoded with `premultiplyAlpha: 'none'` and `colorSpaceConversion: 'none'`. A
  missing tile (404/204, or outside `bounds`) is a transparent tile, and the
  shader draws alpha-0 pixels transparent — the one place Freeboard reads alpha
  in a DEM, since the spec treats a missing tile as empty. A new ramp from
  `overlay.setLayer` is `setStyle`, which swaps the shader and keeps the tiles.
- **`raster`** → canvas `TileLayer` over an `ImageTile` source.
- **`fill` / `line` / `circle` / `symbol`** → one `VectorLayer` (geojson) or
  `VectorTileLayer` (MVT, 512-px grid) per run of consecutive layers on the same
  source, styled by ol-mapbox-style's `stylefunction`. It cannot evaluate
  `global-state` (it evaluates with only zoom and distance-from-centre), so
  Freeboard **pre-resolves** it: `resolveLayer` replaces each `["global-state",
  name]` with `["get", name, ["literal", { name: value }]]` and every vector
  layer is re-styled on `overlay.setState`. `get` is typed `value` like
  `global-state`, so the parser coerces the value as MapLibre would (a number
  in `text-field` reads as text), and it is always an expression, so a filter
  never turns into a legacy one. A constant like this is still checked when it
  compiles, so a value of the wrong type (or an unset variable) would become a
  compile error that ol-mapbox-style throws from the render loop.
  `olStyleLayer` drops such a property instead (with one `console.warn`), which
  draws its default, as MapLibre does on the runtime error. All vector layers
  share one style object per build, set on the group as `mapbox-style` with an
  id of its own, and changes go through ol-mapbox-style's `updateMapboxLayer`:
  a new style object per change would grow its module-level caches with every
  change rather than once per build. (The explicit id matters: ol-mapbox-style
  numbers the first style it sees 0, then treats it as unnumbered, and loses
  the setup `updateMapboxLayer` needs to restyle it.) Text is drawn in Roboto
  with the requested weight and style (`fskFonts`). Symbol runs
  declutter among the overlay's own layers.

Layer `minzoom` / `maxzoom` are MapLibre zooms (512-px world); OL resolutions are
derived from them (`resolutionRange`). Below a tiled source's `minzoom` nothing
is drawn; past its `maxzoom` OL over-zooms. `raster-opacity` and
`color-relief-opacity` may follow zoom or global state and are re-evaluated on
`moveend`.

Night mode needs nothing: the `app-night` CSS filter dims the whole map,
overlays included.

With the split view open the second pane draws a data overlay
through copies of its layers that share their sources
(`split-view/layer-mirror.ts`). Vector styles, layer zoom ranges and visibility
carry over and apply at each pane's own zoom. A `color-relief` layer's ramp is
not a layer property, so the layer hands each copy its style through `ON_TWIN`
(`ol/lib/util.ts`), and every new ramp after it. `raster-opacity` and
`color-relief-opacity` are evaluated at the main chart's zoom, and the second
pane uses the same value. `overlay.refresh` with `tiles` refreshes exactly
those tiles; the second pane, at another zoom, keeps its own until they are
refreshed too or fall out of the cache, so an extension whose data changed
broadly refreshes without `tiles`.

### Live changes

The methods are a pure factory over the registry (`overlay-methods.ts`); each
changes the `DataOverlayModel`, which emits a change the component applies.

- **`overlay.refresh`.** Tiles are fetched with `fetch`, not `<img>`, by one
  `TileFetcher` per source, which keeps up to 256 tiles' bytes and 32 decoded
  bitmaps in memory. A refresh marks the tiles stale in the model
  (`needsReload`: fetched next with `cache: 'reload'`), drops them from the
  fetcher and, once per animation frame for a burst of refreshes, bumps the OL
  source key. OL then asks for every visible tile again — keeping the old ones
  on screen until the new ones load — but only the refreshed ones are fetched
  and decoded.
  Vector tiles carry a per-tile revision in their OL tile key so the source
  reuses every unrefreshed source tile. A whole-source refresh drops them all. A
  geojson URL is fetched again with `cache: 'reload'`.
- **`overlay.setData`** replaces or upserts/removes features of a geojson source
  in the model; the component mirrors it into the OL `VectorSource`. Changes to
  a URL source that has not loaded yet, or is reloading, are applied to the
  data that load brings. A reload that fails keeps the features drawn.
- **`overlay.setLayer`** merges into the model's copy of the layer and re-runs
  `analyzeLayer`; a result it would skip is refused with `overlays.unsupported`
  and the layer is left alone. The component re-styles the affected OL layer, or
  rebuilds the OL layers (sources and fetched tiles are kept) when the set of
  drawn layers changes or a raster layer's resampling does.
- **`overlay.setState`** updates the model's values and re-styles every vector
  run and opacity.

The OL static-image trap from #1012 does not arise: nothing is drawn from one
image.

### Error reasons

`overlays.unknownId` (an overlay of no caller-owned id), `overlays.badRequest`
(bad params; a source, layer or tile the style does not have; `setData` on a
non-geojson source or with `data` and `upsert`/`remove` together; `tiles` on a
geojson source; any data method on an image overlay, or `overlay.frame` on a data
overlay), `overlays.unsupported` (`setLayer` to something Freeboard would not
draw).

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/data-overlay-style.ts` | style parsing, source plans, URL resolver, per-layer draw/skip verdicts, ramp parsing, `global-state` resolution |
| `src/app/modules/plotterext/data-overlay-model.ts` | one data overlay's live state: changed layers, `global-state`, geojson features, stale tiles; change events |
| `src/app/modules/plotterext/overlay-methods.ts` | `overlay.refresh` / `setData` / `setLayer` / `setState` alongside the shared methods |
| `src/app/modules/plotterext/plotterext.service.ts` | manifest parsing and style loading (`overlayDefinitions`, `fetchDataStyles`) |
| `src/app/modules/map/ol/lib/data-overlay/layer-data-overlay.component.ts` | the OL layer group: builds, styles and live-updates the layers |
| `src/app/modules/map/ol/lib/data-overlay/style-to-ol.ts` | DEM decode, ramp → shader expression, MapLibre zoom ↔ OL resolution |
| `src/app/modules/map/ol/lib/data-overlay/tile-fetcher.ts` | credentialed, cache-aware tile fetching with an in-memory cache |

## The `actions` capability

`actions` lets an extension declare things the user can do to something on the
chart, with the kinds of target each applies to (spec: *Actions*). Freeboard
offers them in its chart context menu and in feature popovers, and reports the
choice. Not yet here: `overlayFeature` targets (`actions.overlay`, #1109).

### Which actions apply

`extensionActions` (service) holds the usable actions of compatible manifests,
read by the pure `usableActions` (`actions.ts`): an action missing `id`,
`title` or `targets`, one that cannot be performed (an unknown `action.type`, a
`publish` without a `topic`, a panel or window type naming no iframe panel of
its manifest), or one whose every target entry is ignored, is left out. A target entry is ignored when its kind is not one
Freeboard offers or it narrows a kind with a field that kind does not take.
`match` uses the `resources.setFilter` evaluator, which lives in
`filter-condition.ts` for both. `actionsFor(selected)` filters by target and by
visibility: the manifest `visible`, overridden per action by
`actions.setVisibility`. The override is kept in memory only, so a reload starts
from the manifest again.

### Targets (`map/map-targets.ts`)

The map turns what the user selected into a target, keyed by its own feature
ids, the same ones `processMapClick` reads:

| Feature | Target | `match` sees |
|---------|--------|--------------|
| `waypoint.<id>`, `note.<id>`, `region.<id>` | `id`, `href` `/resources/<type>/<id>`; a waypoint's or note's `featurePosition` | the cached `SK*` object |
| `route.<id>` | stored: `id`, `href` and `routeId` from the route registry; a never-saved draft: `routeId` only | the stored route; a draft `{ name }` |
| `track.<id>` | `href` `/tracks/<id>` for a Track API track, `/resources/tracks/<id>` otherwise | `{ name, description }` |
| `vessels.<urn>` (the own vessel; its id is the server's self context) | `context` = the feature id, `self: true` | — |
| `ais-vessels.<urn>` | `context: 'vessels.<urn>'`, `self: false` | — |
| `atons.*`, `aton.*`, `shore.*` | `context` = the feature id | — |
| an S-57 feature (`s57.<LNAM>`) | `class` = its tile `layer`, `name` = `OBJNAM`, `properties` = its attributes, a point's `featurePosition` | the target |

Every target's `position` is the canonical click point, never the world-copy
offset. A chart feature carries no `chart.id` yet (optional in the spec): the
hit test reports features, not which chart layer drew them. Trails, AIS tracks, route points, the destination flag, SaR and meteo
stations make no target.

### Where actions appear

- **Chart context menu** (`fb-map.component.html` `#contextMenu`). After
  Freeboard's own items, one group per target, each with a header naming it:
  first the features under the pointer that make a target, then the position
  ("This position"). Each item names its extension. `contextMenuContent`
  decides what opens. Freeboard's own items are left out where they always
  were: in kiosk mode, over an open popover, and while drawing, measuring,
  modifying or box-selecting. Extension actions show everywhere except during a
  modal interaction (those four, guard-zone editing and a pick), so position
  actions can be reached at every point. With nothing to show, no menu opens. The split view's second pane goes through the same path.
- **Feature popovers.** `<fb-ext-actions>` (`ext-actions.component.ts`) is
  projected into the resource, vessel, aton and S-57 popovers and the track
  popover, for the target `formatPopover` stores in `IPopover.target`. The
  popover title names the target. Up to four actions show as buttons grouped
  under their extension's name; more go into one menu. A popover left open
  when a pick starts shows none until the pick ends.
- A touch long-press now emits the right-click before the menu event
  (`map.component.ts` `touchHold`), so the menu sees what is under the finger.

### Choosing an action

`invokeAction` acts as a button would, with one difference: a toggle opens.
`publish` adds `actionId` and `target` to the action's `params`. A panel is
opened with the invocation on its `openPanels` entry, which the drawer passes
to `attachPanel`. A window opens through the button machinery
(`openTrackedWindow`, keyed per action in `actionWindows`), with the invocation
on `ExtWindow.invocation`. Choosing the action again raises that window. Then
`action.invoked` goes to the extension's contexts that are already loaded. A
panel or window the action has just loaded is not attached yet, so it gets the
invocation from its handshake (`context.invocation`) and not from the event.

### Error reasons

`actions.badRequest` (`ids` not a list of strings, or `visible` not a boolean),
`actions.unknownId` (an id that is not in the caller's manifest; nothing
changes). The embedding host has no manifest, so every id it sends is unknown.

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/actions.ts` | target-entry parsing, usable actions, matching (target types come from the bus) |
| `src/app/modules/plotterext/action-params.ts` | the `actions.setVisibility` params schema |
| `src/app/modules/plotterext/filter-condition.ts` | the condition evaluator shared with `resources.setFilter` |
| `src/app/modules/plotterext/plotterext.service.ts` | `extensionActions`, `actionsFor`, `invokeAction`, `actions.setVisibility`, invocation in handshakes |
| `src/app/modules/plotterext/ext-actions.component.ts` | the popover row / menu |
| `src/app/modules/map/map-targets.ts` | feature id → target |
| `src/app/modules/map/fb-map.component.ts` | context-menu content, popover targets |
| `dev-tools/fsk-mcp/src/tools.ts` | `fsk_set_action_visibility` / `fsk_list_action_invocations` (the bridge's hidden probe action) |

## The `map.pick` capability

`map.pick` lets an extension ask the user to pick a point or a feature on the
chart (spec: *Picking on the map*). It shares the target vocabulary of
`actions` and builds its targets the same way, but does not need an action in
the manifest. Not yet here: `overlayFeature` entries (`actions.overlay`, #1109).

### The pick model

The pick is the map's, in `FBMapInteractService` beside draw, measure and
modify: `pick()` holds the one pick that is on (`pickId`, the asking
extension's name, `prompt`, the parsed `rules`), host-wide. `startPick`
supersedes a pick already on; `endPick(pickId, outcome)` ends it once, and
every end goes out on `pickEnded`. The service keeps which context asked
(`pickOwner`) and turns each end into `map.picked` for that context only.

- **Request.** `parsePickParams` (`map-pick.ts`) reads `targets` with the
  actions grammar (`parseTargetEntry`): entries Freeboard ignores are dropped,
  and a `targets` that keeps none is `map.badRequest`. No `targets`: a point.
- **The select.** While a pick is on, `onMapSingleClick` hands the click to
  `selectForPick` before anything else, so it opens no popover, adds no point
  and pins no cursor. The features under the pointer become targets through
  `targetsAt` (the context menu's path), and `pickedTarget` takes the first, in
  hit order, that a rule accepts, then the point if `position` is a rule.
  When several pickable things are under the pointer, Freeboard takes the
  topmost one; there is no chooser. A click on nothing the pick accepts is
  ignored and the pick stays on. Pan, zoom and double-click zoom work as
  usual; the split view's second pane goes through the same path.
- **While it is on.** `fb-interact-help` shows the prompt under the asking
  extension's name (Freeboard's own wording when there is no prompt) with a
  **Cancel** button, and the cursor is a crosshair. No context menu opens,
  and popovers show no extension actions. The toolbar stays live, so the
  user can start something else, which ends the pick.

### How a pick ends

| `map.picked` | When |
|--------------|------|
| `{ pickId, target }` | the user picked |
| `reason: 'user'` | the prompt's Cancel |
| `reason: 'extension'` | `map.cancelPick` from the context that asked; from any other context it does nothing |
| `reason: 'superseded'` | another `map.pick`, from any context |
| `reason: 'host'` | Freeboard starts a modal interaction: draw, measure, modify, box select (`interactionStarted`) or a guard-zone edit (fed in by `fb-map` through `setZoneEditing`) |
| none | the asking context detaches (`detach`) |

### Error reasons

`map.badRequest` (params not an object, `prompt` not a string, `targets` not
a list or keeping no supported kind, a `map.cancelPick` without a string
`pickId`), `map.pickBusy` (`isBusyForPick`: drawing, measuring, modifying, box
selecting or editing a guard zone). Freeboard always has `map.pick`, so it
never answers `map.notSupported`. The embedding host can pick too: it gets
the full host API, and its prompt is headed "Embedding app".

### Key files

| File | Role |
|------|------|
| `src/app/modules/plotterext/map-pick.ts` | request parsing, what a select yields |
| `src/app/modules/map/fbmap-interact.service.ts` | the pick state, busy check, host ends |
| `src/app/modules/plotterext/plotterext.service.ts` | `map.pick` / `map.cancelPick`, `pickOwner`, `map.picked`, ending on detach |
| `src/app/modules/map/fb-map.component.ts` | `selectForPick`, no menu during a pick, the guard-zone bridge |
| `src/app/lib/components/interact-help.component.ts` | the prompt and Cancel |
| `dev-tools/fsk-mcp/src/tools.ts` | `fsk_pick` / `fsk_cancel_pick` / `fsk_list_picks` |

## Extending the host API? Update the agent bridge

When you add or change a host API method here, also add or update the matching
tool in [`../../dev-tools/fsk-mcp/src/tools.ts`](../../dev-tools/fsk-mcp/src/tools.ts)
so the `fsk-mcp` dev bridge can drive the new behaviour from an agent (setup:
[`../dev-tools/fsk-mcp.md`](../dev-tools/fsk-mcp.md)). The generic `fsk_call` tool
already reaches any method; the curated tools are for discoverability.

## See also

- [`../api/plotter-extensions-api.md`](../api/plotter-extensions-api.md) — the
  host-agnostic API contract.
- [`../api/plotter_extension_provider_plugins.md`](../api/plotter_extension_provider_plugins.md)
  — the guide for plugin authors providing extensions.
- [`signalk-plotterext-bus`](https://www.npmjs.com/package/signalk-plotterext-bus)
  — the wire-format/message-bus package (the protocol contract).
