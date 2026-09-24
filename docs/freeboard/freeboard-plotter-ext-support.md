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
package; Freeboard depends on it (`^0.13.0`) and imports its host entry point
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

`widgets`, `panels.iframe`, `buttons`, `signalk.stream`, `signalk.put`, `units`,
`map`, `resources`, `resources.filter`, `routes`, `charts`, `charts.time`,
`nightMode`, `resourceGroups`, `background.iframe`, `ui`.

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
  names/descriptions plus the route description round-trip through save.
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
`map.fitBounds` drive it, and `map.view` follows it.

Moves are routed through Freeboard's own centering path
(`AppFacade.mapMoveRequest` → `AppComponent` effect → `centerAndZoom`), never by
reaching into the OpenLayers view directly — driving the OL view bypasses the
`mapCenter`/`mapZoom` signal flow, so chart and resource layers would not refresh
after the move.

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

## Extending the host API? Update the agent bridge

When you add or change a host API method here, also add or update the matching
tool in [`../../dev-tools/fsk-mcp/src/tools.js`](../../dev-tools/fsk-mcp/src/tools.js)
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
