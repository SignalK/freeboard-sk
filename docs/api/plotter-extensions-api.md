# Working with the Plotter Extensions API

Web-based Signal K chartplotters (e.g. Freeboard-SK) are general-purpose
applications. Many valuable features — instrument widgets, custom panels,
domain-specific tooling — are too specific to bundle into a chartplotter's
core, yet forking the application to add them fragments the community.

The **Plotter Extensions API** defines a Signal K resource type —
`plotterExtensions` — through which any server plugin can offer optional
features to chartplotter applications without forking them. A host
chartplotter discovers extension manifests at runtime and lets the user
place and configure the contributions. Extensions are distributed through
the existing Signal K plugin/app-store flow.

`plotterExtensions` is a user-defined resource type hosted under the
`resources` path, so the collection is accessible at:

```text
/signalk/v2/api/resources/plotterExtensions
```

> **Status: draft.** This document describes extension API version `1` as
> implemented by the reference host (Freeboard-SK) and the reference
> extensions (`signalk-instrument-widgets`, `signalk-poi-search`): widgets,
> panels, toolbar buttons, state storage, Signal K data relay, unit
> preferences, resource display filters, map control, live route editing,
> chart-layer management and headless background runtimes. Manifest-declared
> filter chains and host-into-runtime calls are out of scope for this version
> (see Non-Goals).

---

## Design Principles

1. **Host-agnostic.** Nothing in the manifest or wire protocol names a
   specific chartplotter. Hosts identify themselves and their capabilities
   at runtime; extensions declare what they need.
2. **Framework-neutral.** The baseline integration unit is a sandboxed
   iframe plus a plain-JSON message protocol. Extensions need no particular
   UI framework and no TypeScript.
3. **Capability negotiation, not version lockstep.** An extension declares
   required and optional capabilities; a host only offers extensions whose
   requirements it can meet.
4. **The host stays the orchestrator.** Extensions interact through a
   deliberate host API — never host internals or the host DOM.
5. **Enablement lives on the server.** The user installed and enabled the
   providing plugin; that is the consent signal. The server's plugin
   enable/disable switch turns the whole extension off. Hosts must not add
   a second per-extension enable gate — presence in the
   `plotterExtensions` collection means enabled.

---

## Discovery

A host fetches the collection and receives extension manifests keyed by
extension id (the providing plugin's id is the recommended key):

```json
{
  "signalk-instrument-widgets": {
    "name": "Instrument Widgets",
    "description": "Single-value instrument widgets: gauge, percent meter and switch.",
    "version": "0.2.0",
    "apiVersion": "1",
    "requires": ["widgets", "panels.iframe", "signalk.stream"],
    "optional": ["signalk.put", "units"],
    "widgets": [
      {
        "id": "gauge",
        "title": "Gauge",
        "type": "iframe",
        "url": "/plotterext/signalk-instrument-widgets/gauge.html",
        "size": "1x1",
        "configPanel": "instrument-config",
        "lifecycle": "whileEnabled"
      }
    ],
    "panels": [
      {
        "id": "instrument-config",
        "title": "Instrument Setup",
        "type": "iframe",
        "url": "/plotterext/signalk-instrument-widgets/config.html",
        "lifecycle": "onOpen"
      }
    ]
  }
}
```

**Manifest fields**

- `name`, `description`, `version` — display metadata.
- `apiVersion` (required) — extension API major version; this document
  defines `"1"`. Hosts must not offer manifests targeting a newer version.
- `requires` — capability ids the host must support for the extension to be
  offered at all.
- `optional` — capability ids the extension uses when present; absence must
  not prevent it from running.
- Contribution sections: `widgets`, `panels`, `buttons`, `background` (this
  version). Hosts must ignore unknown sections and fields.
- Any individual contribution entry may declare its own `apiVersion` when
  it needs a newer host API than the manifest baseline; hosts silently omit
  contributions they cannot satisfy while keeping the rest.

**Capability identifiers (version 1)**

| Capability          | Meaning                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `widgets`           | Host supports the widget grid described below (including the configuration-panel methods `ui.openConfigPanel` / `ui.closePanel`). |
| `panels.iframe`     | Host supports iframe panels.                                                                                                      |
| `background.iframe` | Host supports headless background-runtime iframes (no UI, loaded while the extension is present).                                 |
| `buttons`           | Host renders extension toolbar buttons in at least one slot.                                                                      |
| `signalk.stream`    | Host streams Signal K path values to extension contexts over the message bus.                                                     |
| `signalk.put`       | Host relays Signal K PUT requests from extension contexts.                                                                        |
| `units`             | Host exposes the user's preferred display units (`units.get`).                                                                    |
| `map`               | Host implements the `map.*` methods (view query and control) and emits `map.view` when the chart viewport changes.                |
| `resources`         | Host implements `resources.list` (relayed resource queries).                                                                      |
| `resources.filter`  | Host implements imperative resource display filters.                                                                              |
| `routes`            | Host implements live route edit-buffer commands (`route.*`) and emits route lifecycle/mutation events.                            |
| `charts`            | Host implements chart-layer management (`chart.*`) — enumerate the managed charts, toggle visibility/opacity/order — and emits `chart.*` change events. |
| `charts.time`       | Host can retarget a time-varying chart to a chosen instant (`chart.setTime`), reports each chart's time dimension in `chart.list`, and emits `chart.time`. Requires `charts`. |
| `resourceGroups`    | Host can apply a stored resource group (`resourceGroup.apply`) — show the group's routes, waypoints, regions and charts — and emits `resourceGroup.applied`. |
| `nightMode`         | Host implements the `nightMode.*` methods (read/force the night-vision display state, follow the server's `environment.mode`) and emits `nightMode.changed`. |
| `ui`                | Host implements `ui.openPanel` / `ui.closePanel`.                                                                                 |

The vocabulary is open-ended: future versions add ids (buttons, resource
filters, map control), and hosts may expose vendor-specific experiments
under a prefix such as `x-<host>.<capability>`. Unknown ids in `optional`
are ignored; unknown ids in `requires` make the extension incompatible.

---

## Widgets

A widget is a small, always-visible tile overlaid on the chart — for
glanceable state, not complex interaction (interaction belongs in panels).

**Layout model.** The host defines _widget areas_ at fixed anchor positions
of the chartplotter window — typically corners and/or edge centers; the set
is the host's choice (the reference host uses top-right, top-center,
bottom-center, bottom-left and bottom-right, reserving top-left for its own
controls). Each area is a grid of **2 columns × 2 rows**. A widget declares
only its size in grid cells as `<columns>x<rows>`: `1x1`, `2x1`, `1x2`, or
`2x2`.

**Placement is entirely the user's choice.** The user decides which area
and cells a widget occupies; the host provides the placement UI and
persists the layout. A widget never requests a position. (Reference host
UI: press-and-hold an empty anchor cell lists the widgets that fit there;
widgets pack from the screen edge inward.)

**Instances.** Placement is cell-based, not area-exclusive: widgets from
different extensions may share an area, and the same widget definition may
be placed multiple times. The host assigns each placement a unique, stable
instance id (a GUID), persists it with the layout, and passes it in the
handshake `context.instanceId`. Per-instance state is keyed by that id, so
two instances of the same widget are configured independently.

**Configuration.** A widget entry may name a panel from the same manifest
via `configPanel`. Pointer events inside a sandboxed iframe are invisible
to the host, so the press-and-hold gesture is detected by the widget
content itself (the reference client library implements it), which calls
the host method `ui.openConfigPanel` or `ui.toggleConfigPanel`. The host
opens the named panel with `context.targetInstance` set to the widget's
instance id and `context.targetWidget` set to the widget's manifest-local
id, and must also provide a gesture-independent path to the same panel plus
an affordance to **remove** the widget instance (the reference host places a
Remove button in the configuration dialog). A widget that also handles a
short tap should distinguish it from a long press so the press-and-hold does
not trigger the tap action. A widget with **no** `configPanel` still gets a
configuration dialog on long-press so it can be removed (the reference host
shows a remove-only dialog).

**Widget fields:** `id`, `title`, `type` (`iframe`), `url`, `size`,
`configPanel?`, `lifecycle?`, `apiVersion?`.

---

## Panels

A panel is interactive content the host displays inside its existing UI
(dialog, drawer — the host chooses the chrome). The baseline type every
host supporting `panels.iframe` must implement is a sandboxed iframe served
by the providing plugin.

**Panel fields:** `id`, `title`, `type` (`iframe`), `url`, `lifecycle?`,
`apiVersion?`.

**Lifecycle values**

- `onOpen` — load when opened, unload when closed.
- `keepAlive` — load on first open, keep running (hidden) while available;
  panel state survives close/reopen.
- `whileEnabled` — load while the extension is available, independent of
  visibility (the expected default for placed widgets).

Panels are opened by toolbar buttons, by the host methods `ui.openPanel` /
`ui.togglePanel` (e.g. a widget tap), or — for configuration panels — by
`ui.openConfigPanel` / `ui.toggleConfigPanel`. The `toggle*` variants close
the panel if it is already the active one, otherwise open it. The reference
host shows general panels in a right-side drawer that pushes the chart
aside, and configuration panels in a dialog.

---

## Background Runtimes

A background runtime is a **headless** extension context — a hidden iframe
with no UI — declared in a `background` manifest section and gated by the
`background.iframe` capability:

```json
{
  "background": [
    {
      "id": "search-service",
      "title": "POI Search Service",
      "type": "iframe",
      "url": "/plotterext/signalk-poi-search/runtime.html"
    }
  ]
}
```

The host loads one iframe per declared runtime **while the extension is
present in the collection** (i.e. its providing plugin is enabled) and tears
it down when the extension leaves — independent of any panel or widget being
open. This is the distinction from a `keepAlive` panel: a kept-alive panel is
a _visible_ context that had to be opened at least once, whereas a runtime
runs from the moment the extension is available with no user interaction. A
host that supports `background.iframe` **must not** keep a visible panel
alive merely to give an extension background behavior — that is what runtimes
are for.

A runtime speaks the same bus protocol as widgets and panels; its handshake
`context.kind` is `background`. It may call the host API — `state.*`
(extension scope by default, as it has no widget instance), `signalk.*`,
`resources.*` including `resources.setFilter`, `route.*`, `chart.*`, `units.get`,
`map.*`, and `ui.openPanel`/`ui.togglePanel`. It has no `ui.closePanel` or
`ui.*ConfigPanel` (those are panel/widget affordances). The typical use is a
client-side service that holds session state and keeps work alive so a panel
can **close itself** (`ui.closePanel`) without losing that state, then
reattach to the runtime's state when reopened.

`whileEnabled` is the only meaningful lifecycle for a runtime and is implied;
the host does not unload a runtime on its own while the extension is present.

To **trigger** a runtime, the runtime subscribes to a topic with
`events.subscribe` and a `sendMessage` button (see Buttons) publishes that
topic — fire-and-forget, the direction this version supports.

**Background fields:** `id`, `title?`, `type` (`iframe`), `url`,
`lifecycle?`, `apiVersion?`.

> Runtimes a host can _call into_ from a button or a declarative filter (the
> `callRuntime` action) are a further step not part of this version; a
> version-1 runtime drives the host, not the other way around.

---

## Buttons

An extension may contribute buttons to host-defined UI slots:

```json
{
  "id": "open-poi-search",
  "title": "POI Search",
  "slot": "mapToolbar",
  "icon": "travel_explore",
  "action": { "type": "openPanel", "panel": "poi-search-panel" }
}
```

- `slot` — host-defined placement; `mapToolbar` is the one well-known slot
  every host supporting `buttons` must map to a reasonable toolbar
  location. Hosts fall back to a default slot for unknown values.
- `icon` — a Material icon name the host may render; hosts without that
  icon set may substitute a generic extension icon. (A generic `symbol`
  reference field is reserved for the symbols resource integration.)
- `action` — what the button does:

  - `togglePanel` — open the named `panel` from the same manifest, or close
    it if it is already the active panel (recommended; matches the host's
    built-in panel-button behavior).
  - `openPanel` — always open (or switch to) the named `panel`.
  - `sendMessage` — publish a message onto the host bus. The button carries a
    `topic` (the event name) and optional `params`; the host publishes it as
    a bus event delivered to every live extension context that subscribed to
    that topic via `events.subscribe`. This is fire-and-forget — no reply.

    ```json
    {
      "id": "refresh-pois",
      "title": "Refresh nearby POIs",
      "slot": "mapToolbar",
      "icon": "refresh",
      "action": { "type": "sendMessage", "topic": "poi-search:refresh" }
    }
    ```

    The **primary use case is to reach the extension's own background
    runtime** — a button poke that a kept-alive headless context handles
    (re-run a search, recompute a filter, etc.), with any visible result
    flowing back through the normal event loop (`state.changed`,
    `filters.changed`, …). But it is a general message: the host delivers a
    topic to _any_ subscribed context, so it can also drive a panel or, across
    extensions, let a federation of plugins coordinate and even build ad-hoc
    service discovery over nothing but this messaging infrastructure.

    Delivery is subscription-gated — a context receives a topic only if it
    subscribed — so an unheard message simply does nothing. Topics **should**
    be namespaced (e.g. `<extension-id>:<name>` or an `ext.*` prefix) to avoid
    colliding with host events (`state.changed`, `sk.*`, `filters.changed`) or
    with another extension's topics. This is a **convention, not an enforced
    requirement**; the host does not validate topic names.

---

## Communication

Extension iframes talk to the host over a message bus: **JSON-RPC 2.0
inside a routing envelope over `postMessage`**:

```json
{ "bus": "plotterExt/1", "msg": { "jsonrpc": "2.0", "...": "..." } }
```

- **Calls** are JSON-RPC requests with a fresh per-call `id` nonce; exactly
  one response with `result` XOR `error`. Protocol errors use the JSON-RPC
  reserved codes; host API errors use implementation-defined codes with a
  stable string in `error.data.reason`.
- **Events** are JSON-RPC notifications whose `method` is a hierarchical
  dot-separated event name. Hosts only forward events a context subscribed
  to via `events.subscribe`; subscription patterns support
  eventemitter2-style wildcards (`*` one segment, `**` any remainder).
- **Connection**: the **caller** repeats the `bus.ready` notification until
  the **host** answers with `bus.handshake`. In the standard topology the
  caller is an extension iframe posting to its parent host; in the
  reverse-embedding topology the caller is the application embedding the
  plotter, posting to the plotter's child iframe (see *Embedding Hosts*). A
  caller MAY include an `id` in its `bus.ready` payload; the host adopts it as
  `context.id` when it does not otherwise know the caller (the
  reverse-embedding case). In the standard topology the host determines the
  context from the manifest and ignores the payload. The handshake:

```json
{
  "host": "freeboard-sk",
  "hostVersion": "2.24.0",
  "apiVersion": "1",
  "capabilities": [
    "widgets",
    "panels.iframe",
    "buttons",
    "signalk.stream",
    "signalk.put",
    "units",
    "map",
    "resources",
    "resources.filter",
    "routes",
    "charts",
    "background.iframe",
    "ui"
  ],
  "context": {
    "kind": "widget",
    "id": "gauge",
    "instanceId": "b9c1a7e2-4f3d-4c2a-9d1e-7a5b3c8e0f42",
    "targetInstance": null,
    "targetWidget": null
  }
}
```

`context.kind` is `widget`, `panel`, `background` or `embedding-host` (this
version). For a configuration panel, `targetInstance`/`targetWidget` identify
the widget being configured; a `background` runtime and an `embedding-host`
carry neither. An `embedding-host` context describes the **caller** — the
application embedding the plotter — while the plotter remains the API host;
see *Embedding Hosts*.

The reference implementation of both sides of this protocol is the
[`signalk-plotterext-bus`](https://github.com/joelkoz/signalk-plotterext-bus)
npm package (`/host` and `/extension` entry points). Its README documents
the full wire format; **the documented wire format, not the package, is the
contract** — any conforming implementation interoperates.

---

## Embedding Hosts

The contributions above put the plotter on the outside: it is the top-level
page, and each extension runs in a child iframe the plotter created. The bus
also supports the **reverse** arrangement — the plotter runs inside an iframe
embedded by another application (for example, an instrument dashboard that
shows the chart plotter in one of its panes). That outer application is an
**embedding host**.

Roles do not change with topology, only the window each side addresses:

- The **plotter remains the API host/provider** — it serves the same Host API
  it serves to extensions. It is now the *child* iframe, so it directs its bus
  port at `window.parent` instead of at a child iframe's `contentWindow`.
- The **embedding host is the caller** — it plays the role an extension client
  plays (it calls host methods and subscribes to host events) and, as the
  caller, **initiates** the handshake: it posts `bus.ready` to the plotter's
  iframe until the plotter answers `bus.handshake`.

An embedding host is **not** a manifest contribution — there is no
`plotterExtensions` entry, no `requires` list, and no per-extension enable
gate. It discovers what the plotter offers by reading the `capabilities` array
in the handshake, and it identifies itself with an `id` in its `bus.ready`
payload (used for `state.*` namespacing and event attribution); a host that
receives no `id` assigns the default `embedding-host`. The handshake
`context.kind` is `embedding-host` with `instanceId: null`.

An embedding host is offered the **full host API surface** — the same methods a
background runtime receives. Methods that reference a manifest contribution (the
widget and configuration-panel affordances) have no target for an embedding host
and are simply unused.

**Trust is same-origin, and a host MUST enforce it.** Because the plotter did
not create the embedding page, a host **MUST** verify that the parent's origin
matches its own served origin before completing the handshake, and **MUST NOT**
relax the origin check to `*`. A same-origin embedder — for instance, another
Signal K webapp served by the same server — already shares the plotter's
authenticated session and can reach the server's REST/WebSocket APIs directly,
so exposing the host API to it grants no authority it did not already have; a
cross-origin embedder is refused. (If the plotter is configured to talk to a
different server than the one that served the embedding page, the origins will
not match and the handshake is refused — a deliberate limitation, not a bug.)

---

## Host API (version 1)

| Method                  | Params                                         | Result                     |
| ----------------------- | ---------------------------------------------- | -------------------------- |
| `events.subscribe`      | `{ patterns: string[] }`                       | `{ subscriptionId }`       |
| `events.unsubscribe`    | `{ subscriptionId }`                           | `{}`                       |
| `state.get`             | `{ scope?, keys? }`                            | `{ values }`               |
| `state.set`             | `{ scope?, values }`                           | `{}`                       |
| `signalk.subscribe`     | `{ paths: string[] }` (literal paths)          | `{ subscriptionId }`       |
| `signalk.unsubscribe`   | `{ subscriptionId }`                           | `{}`                       |
| `signalk.put`           | `{ path, value }`                              | server PUT response        |
| `units.get`             | —                                              | `{ units }`                |
| `resources.list`        | `{ type, query? }`                             | resource collection        |
| `resources.setFilter`   | `{ type, filter }`                             | `{}`                       |
| `resources.clearFilter` | `{ type }`                                     | `{}`                       |
| `route.list`            | —                                              | `{ routes }` (the visible set) |
| `route.create`          | `{ points (≥2), name?, description? }`         | `{ routeId, rev }`         |
| `route.show`            | `{ ref }` (stored route reference)             | `{ routeId, rev }`         |
| `route.hide`            | `{ routeId }`                                  | `{}`                       |
| `route.delete`          | `{ routeId }`                                  | `{}`                       |
| `route.get`             | `{ routeId }`                                  | `{ routeId, name, description, rev, saved, dirty, points }` |
| `route.replace`         | `{ routeId, points (≥2) }`                     | `{ rev }`                  |
| `route.save`            | `{ routeId, name?, description?, dialog? }`    | `{ href, rev }`            |
| `chart.list`            | —                                              | `{ charts }` (display order) |
| `chart.setVisibility`   | `{ ids: string[], visible: boolean }`          | `{}`                       |
| `chart.setOpacity`      | `{ ids: string[], opacity: number }`           | `{}`                       |
| `chart.setOrder`        | `{ order: string[] }`                          | `{}`                       |
| `chart.setTime`         | `{ ids: string[], time: string \| null }`      | `{}`                       |
| `resourceGroup.apply`   | `{ id }`                                       | `{ applied }`              |
| `map.getView`           | —                                              | `{ center, zoom, bounds }` |
| `map.center`            | `{ position: [lon, lat], zoom? }`              | `{}`                       |
| `map.fitBounds`         | `{ bounds: [west, south, east, north] }`       | `{}`                       |
| `nightMode.get`         | —                                              | `{ enabled, auto }`        |
| `nightMode.set`         | `{ enabled?, auto? }`                           | `{}`                       |
| `ui.openPanel`          | `{ panel }`                                    | `{}`                       |
| `ui.togglePanel`        | `{ panel }`                                    | `{}`                       |
| `ui.openConfigPanel`    | — (widget contexts)                            | `{}`                       |
| `ui.toggleConfigPanel`  | — (widget contexts)                            | `{}`                       |
| `ui.closePanel`         | — (panel contexts)                             | `{}`                       |

**Host events**

These events are part of the API contract — any conforming host emits them,
they are not host-specific. Each is delivered only to contexts that have
subscribed to its name via `events.subscribe` (so a context that never
subscribes pays nothing). A host emits an event when the corresponding
capability is supported: `state.changed` always; `sk.<path>` with
`signalk.stream`; `filters.changed` with `resources.filter`; route events
(`route.*`) with `routes`; chart events (`chart.*`) with `charts` (`chart.time` with `charts.time`);
`resourceGroup.applied` with `resourceGroups`; `map.view` with `map`;
`nightMode.changed` with `nightMode`. The
connection-level notifications `bus.ready` and `bus.handshake` (see
Communication) are the only other host/extension events and are
handled by the protocol layer, not subscribed to.

- `state.changed` — `{ scope, instanceId, keys }`: the extension's stored
  state changed (e.g. its configuration panel saved). Published to the
  extension's subscribed contexts.
- `sk.<path>` — `{ path, value, timestamp, $source }`: a subscribed
  Signal K path value, relayed over the host's multiplexed server
  connection (one upstream connection per host, not per widget).
- `filters.changed` — `{ type, active }`: the extension's display filter for
  a resource type was set (`active: true`) or cleared (`active: false`, e.g.
  the user dismissed the host's filter chip). Extensions should reflect a
  clear in their own UI/state.
- `route.visible` — `{ routeId, rev, name, pointCount, saved, dirty }`: a route
  entered the visible set (became rendered on the chart). A freshly drawn or
  `route.create`d draft arrives `saved:false, dirty:true`; a stored route brought
  into view (`route.show`, or the user displaying it) arrives `saved:true,
  dirty:false`.
- `route.dirty` — `{ routeId, rev, reason? }`: content changed — a reorder,
  multi-point edit, metadata change, or whole-geometry replace. Sets
  `dirty:true`; leaves `saved` unchanged. A subscriber should re-seed with
  `route.get`. This is the conformance floor — see *Live routes*.
- `route.saved` — `{ routeId, rev, href, name, saved, dirty }`: the route's
  current state was persisted to the `routes` resource collection; arrives
  `saved:true, dirty:false`. `href` is the stored resource id, and `name` is the
  persisted name (which the host's save dialog may have just set — e.g. an
  unnamed draft saved as "rt1"), so a follower can relabel without re-fetching.
  The route stays visible and addressable under the same `routeId`.
- `route.hidden` — `{ routeId, rev, saved }`: a route left the visible set.
  `saved:true` — a stored route was made invisible (the resource is untouched and
  can be shown again); `saved:false` — an unsaved draft was deleted (gone for
  good). The umbrella name never overstates what happened.
- `chart.visibility` — `{ id, visible }`: a chart layer was shown or hidden. A
  batch `chart.setVisibility` emits one event per *changed* chart; charts already
  in the requested state emit nothing.
- `chart.opacity` — `{ id, opacity }`: a chart layer's display opacity (0..1)
  changed.
- `chart.order` — `{ order }`: the chart display/stacking order changed; `order`
  is the new full ordered id list, topmost first (the same order `chart.list`
  returns).

- `chart.time` — `{ id, time }`: a time-varying chart was retargeted to a
  different instant (`time` is an ISO 8601 instant) or back to its live frame
  (`time: null`). Emitted only by hosts with `charts.time`. See *Time-varying
  charts*.

  The chart events are **origin-transparent** like the route events — a host
  emits them for *every* change, whether it came from an extension command or the
  user's own chart controls, so a following extension stays in sync no matter who
  is driving.
- `resourceGroup.applied` — `{ id, applied }`: a resource group was applied,
  whether by an extension's `resourceGroup.apply` or by the user choosing a group
  in the host's own UI (origin-transparent). `applied` is the same list the
  method returns. See *Resource groups*.
- `map.view` — `{ center, zoom, bounds }`: the chart viewport was panned and/or
  zoomed. The payload is the same shape `map.getView` returns. Emitted once per
  **settled** view change, not continuously during the gesture. See *Map view*.
- `nightMode.changed` — `{ enabled, auto }`: the host's night-mode state changed.
  Like the route and chart events it is **origin-transparent** — emitted for
  *every* change, whether an extension called `nightMode.set`, the user toggled
  the host's own night-mode control, or the server's `environment.mode` flipped
  while `auto` is on. See *Night mode*.

### Resource queries and display filters

`resources.list` relays a resource collection request through the host's
authenticated client: `{ type: "notes", query: { position: [lon, lat],
distance: 18520 } }` serializes to the resources API query string. This
keeps extensions inside the host's auth/session semantics; extensions may
still call the server REST API directly (same-origin) when needed.

`resources.setFilter` controls what the host _displays_ for a resource
type — it never modifies stored resources:

```json
{
  "type": "notes",
  "filter": {
    "mode": "include",
    "ids": ["urn:mrn:signalk:uuid:..."],
    "match": [
      { "path": "properties.skIcon", "op": "eq", "value": "anchorage" }
    ],
    "label": "Anchorage < 10 nm: 2 matches"
  }
}
```

- `mode` — `include` (show only matching) or `exclude` (hide matching).
- `ids` — resource ids;
- `match` — AND-combined property conditions with
  `op` one of `eq | ne | lt | lte | gt | gte | in | contains | regex |
exists`. `contains` is case-insensitive substring for strings, membership
  for arrays; `regex` tests a JavaScript regular-expression pattern string
  (in `value`) against the field's string value — a non-string field or an
  invalid pattern fails. Conditions on missing fields are false except
  `exists`. At least one of `ids`/`match` is required; when both are present
  a resource must satisfy both.

  **Symbol-reference tolerance.** `eq`, `ne` and `in` compare symbol
  references (per the [Symbols API](https://github.com/joelkoz/signalk-symbol-manager))
  namespace-tolerantly: a bare local id matches a qualified `namespace:id`
  with the same id, and vice versa. So `{ "path": "properties.skIcon",
"op": "eq", "value": "anchorage" }` matches a resource whose stored value
  the host has qualified to `default:anchorage` (or `custom:anchorage`).
  Differing namespaces (`custom:x` vs `fsk:x`) do not match, and only
  single-colon `namespace:id` values participate — multi-colon strings such
  as URNs keep strict equality. An extension that needs exact matching of a
  qualified reference should set `"exact": true` on the condition (or write
  the fully-qualified `value`, or use `regex`). With `exact`, `eq`/`ne`/`in`
  compare strictly and `anchorage` will not match `default:anchorage`.

- `label` — short human-readable description. **Hosts must surface active
  filters to the user** (the reference host renders clearable chips) and
  let the user clear any filter without opening the owning extension.

The host tracks at most one filter per (extension, resource type); a new
`setFilter` replaces it. Filters from multiple extensions compose by
intersection. Filters are not persisted across host reloads.

### Live routes

The `routes` capability gives an extension read/write access to the routes the
host currently has **visible on the chart**, plus a stream of lifecycle and
mutation events. The visible set is small and practical — the one or two routes a
user is actually working with — never the hundreds that may be stored on the
server.

**The visible set.** A host renders some routes on the chart: routes the user is
drawing or modifying, routes an extension created, and stored routes the user has
chosen to display. Every route in that set is addressable. Routes that exist only
on the server (the stored catalog) are **not** — an extension that wants one
browses the server's resources API directly (`GET /resources/routes` returns the
whole catalog with full geometry) and asks the host to display it (`route.show`).

**Addressing — opaque handles.** Each visible route has a host-assigned `routeId`
that is **opaque**: the extension treats it as a token and never parses it. The
host mints and decodes it (it may encode a stored resource id, an ephemeral draft
id, or anything else — that is implementation, kept behind the handle). A
`routeId` is stable for as long as the route stays visible. Every command and
event names its `routeId`. `route.list` enumerates the visible set; a host that
only ever shows one route at a time simply exposes one entry.

**Two flags: `saved` and `dirty`.** Orthogonal, and both appear on `route.get`,
`route.list`, and the lifecycle events:

- `saved` — is the route backed by a persisted `routes` resource? A never-saved
  draft is `false`; a stored route is `true`.
- `dirty` — does the in-memory geometry differ from what is persisted (pending
  unsaved changes)? A clean route is `false`; an edited one is `true`.

  | `saved` | `dirty` | state |
  | ------- | ------- | ----- |
  | `false` | `true`  | a draft with content — needs saving to persist |
  | `true`  | `false` | a clean stored route — matches the server |
  | `true`  | `true`  | a stored route with unsaved edits |

**Editing stages; it does not write through.** Manipulating a visible route —
`route.replace`, or the user's own native editing — changes the in-memory route
and emits `route.dirty` (setting `dirty:true`); it does **not** touch the server,
and it leaves `saved` unchanged. The change is committed only by `route.save`, or
discarded by the host's editing UI / `route.hide` (for a draft). This mirrors how
a native editor already works — manipulate, then save or discard — and applies
uniformly to drafts and stored routes.

**Bringing routes in and out of view.** The function calls are deliberately the
traditional **create / show / hide / delete**; the visibility/`saved`/`dirty`
model lives in the *events* and route properties, not in the verbs.

- `route.create({ points, name?, description? })` adds a new unsaved route to the
  visible set (`saved:false`). `points` is **required and must hold at least two
  waypoints** (a route needs a segment); fewer is rejected with
  `routes.badRequest`. `description` is the route-level description (distinct from
  a waypoint's per-point `description`) and round-trips through `route.get` and
  `route.save`.
- `route.show({ ref })` brings an existing **stored** route into the visible set
  and returns its `routeId`, so the extension can read and edit it in place.
- `route.hide({ routeId })` removes a route from the map. For a **stored** route
  this just unchecks its visibility — the resource is untouched
  (`route.hidden saved:true`). For an **unsaved** route it deletes it, since the
  only store it has is the visibility buffer (`route.hidden saved:false`).
- `route.delete({ routeId })` **permanently deletes a stored route** from the
  resource collection. Deleting an *unsaved* route has the same effect as hiding
  it (the draft is discarded). Either way the route leaves the visible set as
  `route.hidden saved:false` (gone — no longer retrievable).

So `hide` and `delete` both emit `route.hidden`; the event's `saved` flag tells a
follower the outcome (`true` = still on the server, `false` = gone), while the
*verb the extension called* carries the intent.

**Points and geometry.** A route's points are an ordered list (0-based). A point
is `{ position: [lon, lat, alt?], name?, description? }` — `name`/`description`
map to a host's per-point metadata and round-trip through `route.get`,
`route.replace`, and `route.save`. `route.create` and `route.replace` require at
least two points and reject a malformed point (a non-numeric `position`, or
non-string `name`/`description`) with `routes.badRequest`.

**Revisions and mirroring.** Each route carries a monotonic `rev` that
increments on every mutation. `route.get` and `route.list` report the current
`rev`, and every mutation event and every mutating command result carries the
post-change `rev`. In v1 the mutation signal is **`route.dirty`**: an extension
mirrors a route by calling `route.get` whenever it sees `route.dirty` (or a `rev`
gap). The protocol still offers a full snapshot (`route.get`) so the author never
has to reconstruct state from a partial stream.

**`route.dirty` is the conformance floor.** Every change to a visible route's
content — a multi-point edit, a whole-geometry `route.replace` (e.g. an
auto-router's), a metadata change, or the reference host's `Modify` flow (which
hands back a whole coordinate array with no "which vertex moved") — emits
`route.dirty`. A host emits `route.visible`, `route.hidden`, `route.saved`, and
`route.dirty` — geometry is always edited as a whole (`route.replace` or the
host's own native editing), so a single "on `route.dirty`, `route.get`" keeps a
follower in sync without tracking who changed what.

**Origin transparency.** Events are emitted for _every_ change regardless of
origin — an extension command, the user's native editing, or another
extension — so a follower stays consistent no matter who is driving. As with
all host events, a context receives them only after `events.subscribe` (e.g.
`{ patterns: ["route.**"] }`).

**Saving.** `route.save` persists the route's current state to the `routes`
resource collection through the user's authenticated session, returning the
stored resource `href` and emitting `route.saved` (`saved:true, dirty:false`).
The route **stays visible and addressable under the same `routeId`** — saving
does not remove or invalidate it. For a never-saved draft this creates a new
resource; for an already-stored route with pending edits it updates that
resource. It is **headless by default** — saved with the supplied
`name`/`description`, falling back to the route's current name. Pass
`dialog: true` to have the host prompt for the name/description instead, its
dialog prefilled from those params; the reference host (Freeboard-SK) opens its
Route Details dialog, and a cancelled dialog rejects with `routes.saveCancelled`.

Note the `routeId` is the host's **opaque handle**, distinct from the `href` of
the saved resource (an `/resources/routes/<id>` reference returned by the save) —
they are not interchangeable, and a saved route keeps the same `routeId` it had
before the save.

**Errors** use the standard `error.data.reason` convention: `routes.unknownId`
(no such `routeId`), `routes.badRequest` (invalid params — e.g. `route.create`
with fewer than two points, a non-numeric `position`, or non-string metadata),
`routes.badRef` (`route.show` reference not found), `routes.saveFailed` (server
rejected the persist — distinct from a user cancel), `routes.saveCancelled` (the
user dismissed the save dialog), `routes.notSupported` (host lacks `routes`).

### Chart layers

The `charts` capability is a **lightweight facade over the chart layers the host
already manages** — the same charts the user turns on and off in the host's own
chart controls. An extension enumerates them, reads which are shown and in what
order, and changes visibility, opacity and stacking order. It is deliberately
**not** a chart provider: there is no create, add, import, or delete. Chart
sources come from the server's charts resource and the host's own configuration;
this capability only *manages the display* of what already exists.

**Addressing — opaque ids.** Each managed chart has a host-assigned `id` that is
**opaque**: the extension treats it as a token and never parses it (a host may
back it with a charts-resource id, a built-in layer key, or anything else). An id
is stable for as long as the chart stays in the host's managed set. Every command
and event names charts by `id`.

**Enumerating — `chart.list`.** Returns the managed charts **in display order,
topmost first** (index 0 is drawn on top). Each entry is:

```jsonc
{
  "id": "noaa-12345",        // opaque, stable, host-assigned
  "name": "NOAA 12345 — Miami",
  "visible": true,
  "opacity": 1.0,            // 0..1
  "type": "raster",          // best-effort: raster | vector | S-57 | WMS | …
  "bounds": [-80.5, 25.5, -80.0, 26.0],  // [west,south,east,north], optional
  "minZoom": 4, "maxZoom": 18            // optional
}
```

`id`, `name`, `visible` and `opacity` are always present; `type`, `bounds`,
`minZoom` and `maxZoom` are best-effort and omitted when the host does not know
them. `bounds` follows the convention in *Bounding boxes* (under *Map view*). Because the array is ordered, `chart.list` also *is* the way to read the
current stacking order — there is no separate `getOrder`.

**Mutating — all batch.** Every mutator takes a set, so an extension turns
several charts on or off (or retints or restacks them) in one call:

- `chart.setVisibility({ ids, visible })` — show (`true`) or hide (`false`) each
  named chart.
- `chart.setOpacity({ ids, opacity })` — set display opacity (0..1) on each named
  chart.
- `chart.setOrder({ order })` — set the display/stacking order. `order` is a list
  of chart ids, **topmost first**. Ids the caller omits keep their existing
  relative order after the named ones. **Order is host-clamped:** a host with
  z-bands, pinned base layers or category grouping honors the requested *relative*
  order within its own constraints rather than promising a literal global stack —
  so `setOrder` expresses intent, and the resulting order is whatever the host
  reports back on the next `chart.list` / `chart.order` event.

**Following changes.** The host emits `chart.visibility`, `chart.opacity` and
`chart.order` for **every** change — an extension's own command, another
extension's, or the user toggling a chart in the host's chart controls (the same
origin-transparency the route events have). A batch `chart.setVisibility` emits
one `chart.visibility` per *changed* chart (charts already in the requested state
emit nothing). Subscribe with `{ patterns: ["chart.**"] }`; re-read `chart.list`
when a fuller snapshot is needed.

**Errors** use the standard `error.data.reason` convention: `charts.unknownId`
(one of the supplied ids names no managed chart), `charts.badRequest` (invalid
params — e.g. a missing `ids` array, a non-boolean `visible`, or an out-of-range
`opacity`), `charts.notSupported` (host lacks `charts`).

#### Time-varying charts (`charts.time`)

Some charts are a picture of *now* — weather radar, satellite imagery, a
nowcast — and the source behind them holds a run of frames, not one image. The
`charts.time` sub-capability lets an extension **retarget one such chart to a
chosen instant** (and back to live) without the provider having to publish one
chart resource per frame. It is still a facade: the host applies the instant to
a chart it already manages; how the provider serves frames is the provider's
business (see the chart-resource convention below).

**Discovery.** A host with `charts.time` adds a `time` object to the
`chart.list` entry of every chart that is time-addressable, and omits it from
charts that are not:

```jsonc
{
  "id": "radar-noaa-composite",
  "name": "NOAA NEXRAD composite",
  "visible": true, "opacity": 0.65, "type": "raster",
  "time": {
    "value": null,                           // instant currently shown; null = live/current
    "current": true,                         // the source serves a live/latest frame
    "from": "2026-09-18T12:00:00Z",          // best-effort timeline metadata — optional
    "to":   "2026-09-18T15:00:00Z",
    "step": 300000                           // ms between frames, when regular …
    // "values": ["2026-09-18T12:00:00Z", …] // … or the explicit instants offered
  }
}
```

`value` and `current` are always present in a `time` object. `from`, `to`,
`step` and `values` describe the timeline **as the host last learned it** —
from the chart resource or the source's own capabilities document — and are
**best-effort metadata for a host or extension UI, not the contract's source of
truth**: for a rolling product the newest frame moves on between reads. An
extension whose own plugin serves the frames already knows the real timeline and
need not consult them at all.

**Retargeting — `chart.setTime({ ids, time })`.** Batch, like every other
mutator. `time` is an ISO 8601 instant (`"2026-09-18T14:35:00Z"`) or `null`,
meaning *the live/current frame*. The host **passes the instant through** to
the source unchanged — it does not snap to `values` or clamp to `from`/`to`.
Resolving a requested instant to an actual frame (nearest, floor, exact-only) is
the provider's decision, so an extension animating a provider it does not own
should pick from `values` when they are given.

A host applying a new instant **should keep the previous frame on screen until
the new one has loaded** rather than blanking the layer: playback steps every
few hundred milliseconds, and at sea a frame may never arrive. A chart that
also auto-refreshes (a `refreshInterval` on the resource) stops refreshing while
`time` is non-null — a historical frame does not change — and resumes when it
returns to `null`.

Time selections are **session state**: a host starts every chart at its live
frame on load and need not persist a selection.

**Following changes.** The host emits `chart.time` `{ id, time }` for **every**
retarget — an extension's `chart.setTime`, another extension's, or the user's
own time control in the host's chart UI — with the same origin-transparency as
the other chart events. A batch call emits one event per *changed* chart.

**Errors:** `charts.notTemporal` (an id names a managed chart that has no time
dimension), `charts.badRequest` (`time` is neither `null` nor a parseable ISO
8601 instant, or `ids` is malformed), `charts.unknownId`, and
`charts.notSupported` (host lacks `charts.time`).

**Chart-resource convention — how a provider makes a chart time-addressable.**
This is a property of the *chart resource* (the entry a chart-provider plugin
serves under `/signalk/v2/api/resources/charts`), not of the extension API, so
it benefits any host with a native time control even when no extension is
involved. A provider adds a `time` block to the resource:

```jsonc
{
  "identifier": "radar-noaa-composite",
  "name": "NOAA NEXRAD composite",
  "type": "tilelayer", "format": "png",
  "url":  "/radar/noaa/composite/{z}/{x}/{y}.png",             // the live/current frame
  "refreshInterval": 300000,                                    // optional, see the host docs
  "time": {
    "url": "/radar/noaa/composite/{z}/{x}/{y}.png?time={time}", // template for a specific instant
    "current": true,
    "from": "2026-09-18T12:00:00Z", "to": "2026-09-18T15:00:00Z", "step": 300000
    // or "values": [ "…", "…" ]
  }
}
```

- For **`tilelayer` / `tileJSON`** sources `time.url` is required: a tile URL
  template carrying a `{time}` placeholder, which the host replaces with the
  requested instant (URL-encoded ISO 8601). The plain `url` is used for
  `null`/live.
- For **WMS and WMTS** sources `time.url` is omitted: the host applies the
  instant through the standard `TIME` request parameter (WMS) or `Time`
  dimension (WMTS), and drops it for `null` so the server's declared default
  applies. A host **may** derive the `time` block itself from the service's
  GetCapabilities when the resource omits it.
- `current: true` says the source serves a live/latest frame, so `null` is a
  valid target. A purely archival source sets `current: false`, and a host
  then starts it at `to` (or the last of `values`).
- `from`/`to`/`step`/`values` are optional and advisory, as above; a provider
  whose timeline rolls should keep them roughly right or omit them.

A host without `charts.time` ignores the `time` block entirely and draws the
chart from `url` as before, so declaring it is safe on every host.

### Resource groups

A **resource group** is a named, stored set of routes, waypoints, regions and
charts — "the Bahamas crossing", "home cruising grounds" — that a user switches
the chart to in one step. Groups are ordinary Signal K resources in the `groups`
collection (`/signalk/v2/api/resources/groups`), so they belong to the server,
not to any one chartplotter. The `resourceGroups` capability does **not** wrap
that collection: an extension creates, edits, deletes and lists groups through
the server's resources API directly (or lists them with
`resources.list({ type: "groups" })`). What only the host can do is **apply** a
group to its display, and that is all this capability adds.

**The group document.** A group resource is:

```jsonc
{
  "name": "Bahamas crossing",
  "description": "Routes and charts for the Gulf Stream crossing",
  "routes":    ["<route id>", "..."],     // optional
  "waypoints": ["<waypoint id>", "..."],  // optional
  "regions":   ["<region id>", "..."],    // optional
  "charts":    ["<chart id>", "..."]      // optional
}
```

The ids are resource ids — the keys of the matching `/resources/<type>`
collection. Each of the four lists is an instruction for its resource type,
with three distinct meanings:

| Value | Instruction for that type |
|-------|---------------------------|
| `["a", "b", …]` | Display these. Ids that resolve to no existing resource are ignored. |
| `[]` | Display none of this type. |
| key absent | Leave this type's display as it is. |

The distinction between `[]` and an absent key is deliberate and must be
preserved: `[]` hides every resource of that type, while an absent key leaves
the type alone. A host that treats them the same will hide things a group's
author meant to leave untouched.

> **Note (non-normative):** `charts: []` hides every chart, which leaves an empty
> map. It is a valid instruction and hosts do not reject it, but group editors
> may reasonably choose not to offer it.

**Applying — `resourceGroup.apply({ id })`.** The host fetches the group with
that id from the server and carries out each type's instruction against its own
display. The result reports what it did:

```json
{ "applied": ["routes", "waypoints", "regions", "charts"] }
```

`applied` lists every type for which the host made a **best-effort attempt** to
carry out the instruction — displaying the listed resources (all of them, or as
many as it can), or hiding the type for `[]`. *How* it does so is the host's
choice: per-resource selection lists, turning a whole layer on or off, or
anything else that resembles what was asked. A host that does not act on a type
— because it does not display that resource type at all, or cannot do anything
resembling the request — omits it from `applied`, exactly as if it did not
support that type. A type whose key is absent from the group is never listed,
since there was nothing to apply.

`applied` reports what the host **attempted**, not the resulting display. An
extension that needs to know what is actually shown follows the display itself
— the `chart.*` and `route.*` events (which a conforming host emits for the
changes an apply causes, like any other change) or `resources.list`.

Whether an applied group's effect survives a host reload is host-defined; the
contract makes no promise either way.

**Following changes.** `resourceGroup.applied` (see *Host events*) is emitted
**origin-transparently** each time a group is applied — by any extension, or by
the user picking a group in the host's own UI — so an extension that tracks the
active group subscribes with `{ patterns: ["resourceGroup.applied"] }`. It is an
event about an *action*, not a readable state: there is no "current group"
query, because a group stops describing the display as soon as the user shows
or hides a single resource by hand.

**Errors** use the standard `error.data.reason` convention:
`resourceGroups.unknownId` (no group with that id, including when the server has
no `groups` collection), `resourceGroups.fetchFailed` (the group could not be
read for another reason), `resourceGroups.badRequest` (invalid params — a missing
or non-string `id`, or a group whose lists are not arrays of strings),
`resourceGroups.notSupported` (host lacks `resourceGroups`).

### Map view

The `map` capability covers the chart viewport — where the map is looking. An
extension **reads** it with `map.getView`, **drives** it with `map.center` /
`map.fitBounds`, and **follows** it with the `map.view` event.

The view is three values, and `map.getView` and `map.view` carry exactly the same
shape:

```jsonc
{
  "center": [-80.19, 25.77],              // [lon, lat] of the viewport centre
  "zoom": 13.4,                           // may be fractional
  "bounds": [-80.5, 25.5, -80.0, 26.0]    // [west,south,east,north]
}
```

`bounds` is the axis-aligned lon/lat box covering what is currently rendered — on
a host whose map can be rotated, the box that contains the rotated view, not the
view itself. Treat it as "at least this much is on screen". `center` and `bounds`
are both in the range described under *Bounding boxes*, so the centre always lies
inside the box.

**`map.view`** (see *Host events*) is emitted when the viewport has **settled** —
once the pan or zoom gesture and any kinetic glide have come to rest, which is
what `moveend` means on the common map engines. It is deliberately **not** a
per-frame stream: a drag across the chart produces one event, not dozens, so an
extension that refetches data for the visible area does so once. A single event
carries the whole view rather than separate pan and zoom notifications, because
one gesture routinely changes both (a pinch-zoom, or a `map.fitBounds`) — an
extension that cares which changed compares against the view it last saw.

Like the route, chart and night-mode events it is **origin-transparent**: the host
emits it for *every* settled change, whether it came from the user dragging the
chart, the host recentring on the vessel, or an extension's own `map.center` /
`map.fitBounds` call.

The usual pattern is seed-then-follow — subscribe with
`{ patterns: ["map.view"] }`, then call `map.getView` once for the starting
state, so no change is missed between the two:

```js
await client.subscribe(['map.view'], (_name, view) => applyView(view))
applyView(await client.call('map.getView'))
```

**Older hosts.** `map.view` was added after the `map` capability itself, so a host
built against the earlier contract advertises `map`, answers `map.getView`, and
never emits. An extension that must work on such a host should fall back to
polling `map.getView` if no `map.view` arrives — but keep the interval slow, since
polling for a change is exactly what this event exists to avoid.

#### Bounding boxes

Every lon/lat box in this API — `bounds` in `map.getView` and `map.view`, the
`bounds` passed to `map.fitBounds`, and a chart's `bounds` in `chart.list` — is
`[west, south, east, north]` in decimal degrees: the GeoJSON bounding-box order
([RFC 7946 §5](https://www.rfc-editor.org/rfc/rfc7946#section-5)), and the same
convention as the Signal K Track API's `bbox`.

- **Longitudes are always in `[-180, 180]`.** A host normalises what it reports,
  even when the user has panned the chart into another copy of the world — map
  engines let the view scroll round the globe indefinitely, and their own
  extents then run past ±180. A longitude outside the range is never sent.
- **A box that crosses the antimeridian has `west` greater than `east`**
  ([RFC 7946 §5.2](https://www.rfc-editor.org/rfc/rfc7946#section-5.2)).
  `[175, -21, -175, -13]` is a box ten degrees wide around 180° (Fiji), **not** a
  band 350 degrees wide round the rest of the world. Nothing else signals the
  crossing, so an extension comparing `west` and `east` must not assume
  `west <= east`.
- **A view showing every longitude** (a very low zoom) is reported as `west` -180
  and `east` 180.
- **`map.fitBounds` accepts the same convention, and also the unwrapped form**
  map engines use internally — `east` past 180 (or `west` past -180) with
  `west < east`, such as `[175, -21, 185, -13]` — and treats it as the same box.
  So an extension can pass a box straight from a Signal K API or straight from
  its own map library. It fits the box the short way round: the box above is
  centred near 180°, never on Greenwich. A box with `south` greater than `north`,
  or a latitude outside `[-90, 90]`, is rejected with `INVALID_BOUNDS`.

Arithmetic on a box has to allow for the crossing. Its width in degrees of
longitude, and whether it holds a longitude, are:

```js
const lonSpan = ([w, , e]) => (e >= w ? e - w : e - w + 360)
const holdsLon = ([w, , e], lon) => (w <= e ? lon >= w && lon <= e : lon >= w || lon <= e)
```

**Hosts built before this convention** may report longitudes past
±180 from `map.getView` / `map.view`, and may centre a `map.fitBounds` box that
crosses the antimeridian in the wrong place. An extension that must support them
can normalise what it receives by wrapping each longitude outside `[-180, 180]`
into range (`((lon % 360) + 540) % 360 - 180`, which holds for any finite
longitude), treating a box 360 or more degrees wide as `[-180, south, 180,
north]`; and can pass `map.fitBounds` a crossing box in the unwrapped form,
which the reference host has always fitted correctly.

### State storage

`state.get`/`state.set` give an extension small host-persisted key/value
storage. Two scopes:

- `instance` — keyed by the context's widget instance (default for widget
  contexts; configuration panels opened with `targetInstance` read and
  write the _target's_ instance scope).
- `extension` — shared across the extension's contexts.

Every successful `state.set` triggers a `state.changed` event — the loop
that lets a widget re-render live while its configuration panel edits it.
Quota and persistence backend are host-defined.

### Unit preferences

Signal K values are SI on the wire, and a path's `meta.units` names the
unit. What the _user_ wants displayed is host configuration. `units.get`
exposes it:

```json
{
  "units": {
    "speed": "kn",
    "distance": "naut-mile",
    "depth": "m",
    "length": "m",
    "temperature": "C"
  }
}
```

Vocabulary: `speed` `kn|m/s|km/h|mph`; `distance` `kilometer|naut-mile`;
`depth`/`length` `m|foot`; `temperature` `C|F`. Hosts may add keys;
extensions must tolerate missing ones. Extensions rendering path values
should combine a path's `meta.units` with these preferences to decide which
conversions to offer and which to preselect.

### Night mode

Marine chartplotters carry a **night-vision display mode** — a dimmed, low-blue
appearance for use after dark. The `nightMode` capability lets an extension read
that state, change it, and follow it, so an embedded panel (e.g. an instrument
gauge) matches the host instead of glowing white on a dark bridge.

The state has two booleans:

```json
{ "enabled": true, "auto": false }
```

- **`enabled`** — whether night mode is *currently applied* (the resolved state the
  user sees). This is what an extension reads to theme its own UI.
- **`auto`** — whether the host is deriving `enabled` from the server's
  `environment.mode` (`night` → on; `day`/`dusk` → off). When `auto` is `true`,
  `enabled` tracks the server automatically.

**`nightMode.get`** returns the current `{ enabled, auto }`.

**`nightMode.set({ enabled?, auto? })`** changes it. The three effective states an
extension can request:

- **Force on** — `{ enabled: true }`.
- **Force off** — `{ enabled: false }`.
- **Follow the server** — `{ auto: true }`.

Setting `enabled` explicitly is a manual override: it implies `auto: false`, so an
extension that forces a value takes the display off the server's `environment.mode`
until `auto` is turned back on. Setting `{ auto: true }` hands control back to the
server and recomputes `enabled` from the current `environment.mode`. A single call
may carry both fields.

**`nightMode.changed`** (see *Host events*) is emitted **origin-transparently** for
every change — an extension's own `set`, the user toggling the host's night-mode
control, or the server's `environment.mode` flipping while `auto` is on — so an
extension that subscribes with `{ patterns: ["nightMode.changed"] }` stays in sync
no matter who is driving. A context that needs the state before the first change
reads it once with `nightMode.get`.

**Errors** use the standard `error.data.reason` convention: `nightMode.badRequest`
(invalid params — e.g. a non-boolean `enabled`/`auto`, or neither field present),
`nightMode.notSupported` (host lacks `nightMode`).

---

## Providing an Extension

A Signal K plugin:

1. Registers a resource provider for the custom type `plotterExtensions`
   (works on current servers — no server upgrade required):

   ```js
   app.registerResourceProvider({
     type: 'plotterExtensions',
     methods: {
       listResources: async () => ({ [PLUGIN_ID]: manifest }),
       getResource: async (id) => {
         /* ... */
       },
       setResource: async () => {
         throw new Error('read-only')
       },
       deleteResource: async () => {
         throw new Error('read-only')
       }
     }
   })
   ```

2. Serves its widget, panel and background assets from a **publicly
   readable**, non-admin-gated route. Manifest URLs are server-relative;
   hosts resolve them against the Signal K server origin. The asset files are
   inert UI code — all data flows through the bus over the user's own
   authenticated session, and extension _discovery_ is gated by the
   authenticated resources API, so an unauthenticated user sees no extensions
   regardless of how the assets are served. For how to mount such a route from
   a plugin, see
   [Plotter Extension Provider plugins](./plotter_extension_provider_plugins.md).

3. Declares inter-plugin relationships through the App Store mechanism
   (`"signalk": { "recommends": ["<plugin-name>"] }` in `package.json`)
   rather than hard dependencies — e.g. an extension that searches another
   provider's resources.

---

## Security and Trust

By the time a manifest is visible, the user has already installed a server
plugin — code that runs unrestricted on the server. Install time is the
trust decision; browser-side isolation is **fault containment, not an
adversarial boundary**:

- Baseline iframe sandbox: `allow-scripts allow-same-origin allow-forms`.
  Same-origin assets plus scripts mean the sandbox attribute is not a
  security boundary; its value is lifecycle isolation, CSS/DOM separation
  and crash containment. `allow-top-navigation`, `allow-popups` and
  `allow-modals` are withheld to prevent accidents.
- The host API validates arguments and applies call timeouts; one broken
  extension must not prevent the host from loading.
- Extension contexts are same-origin with the Signal K server and may call
  its REST/WebSocket APIs directly with the user's session where the host
  API does not suffice.
- When the plotter is itself embedded by another application (see *Embedding
  Hosts*), it exposes the host API to the embedding page **only** after
  verifying that page is same-origin; the parent-facing connection MUST pin
  the origin and MUST NOT use `*`. Same-origin is the sole trust boundary for
  reverse embedding — a same-origin embedder already shares the user's session.

---

## Reference Implementations

- **Protocol**: [`signalk-plotterext-bus`](https://github.com/joelkoz/signalk-plotterext-bus)
  — wire format documentation plus host/extension endpoints with a
  conformance test suite.
- **Extensions**: [`signalk-instrument-widgets`](https://github.com/joelkoz/signalk-instrument-widgets)
  — gauge, meter, switch and display-value widgets with a
  shared unit-aware configuration panel — and
  [`signalk-poi-search`](https://github.com/joelkoz/signalk-poi-search) — a
  toolbar button + keepAlive search panel + results widget exercising
  resource queries, display filters and map control — and
  `signalk-auto-route` *(planned)* — a toolbar button + parameter panel +
  server-side routing engine exercising the `routes` capability (land-avoidance
  auto-routing over the host's live route buffer; see its own SPEC).
- **Host**: Freeboard-SK (feature branch, in development) — anchor-area
  widget overlay, placement UI, state storage, multiplexed Signal K relay,
  toolbar buttons, panel drawer, filter chips, map control.

---

## Non-Goals

This version deliberately does not specify:

- **Manifest-declared filter chains.** Display filtering here is imperative:
  running extension code pushes an id set or `match` predicate via
  `resources.setFilter`. Filters declared _statically in the manifest_ and
  evaluated by the host on every resource fetch are out of scope for this
  version.
- **Host-into-runtime calls (`callRuntime`).** Background runtimes drive the
  host — they call host methods and react to host events; the host does not
  call into a runtime. The reverse call direction is out of scope for this
  version.
