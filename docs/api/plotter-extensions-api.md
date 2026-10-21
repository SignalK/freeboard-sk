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
> chart-layer management, headless background runtimes, image map overlays
> (`overlays.image`), host-drawn data overlays (`overlays.data`), map actions
> (`actions`, `actions.overlay`), map picks (`map.pick`) and button
> visibility (`buttons.visibility`). Manifest-declared filter chains and
> host-into-runtime calls are out of scope for this version (see Non-Goals).

---

## Design Principles

1. **Host-agnostic.** Nothing in the manifest or wire protocol names a
   specific chartplotter. Hosts identify themselves and their capabilities
   at runtime; extensions declare what they need.
2. **Framework-neutral.** The baseline integration unit is a sandboxed
   iframe plus a plain-JSON message protocol. Extensions need no particular
   UI framework and no TypeScript. The one exception is an image overlay
   frame, which carries an `ImageBitmap` in the `postMessage` transfer list
   (see *Map overlays*).
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
- Contribution sections: `widgets`, `panels`, `buttons`, `actions`,
  `background`, `overlays` (this version). Hosts must ignore unknown sections and fields.
- Any individual contribution entry may declare its own `apiVersion` when
  it needs a newer host API than the manifest baseline; hosts silently omit
  contributions they cannot satisfy while keeping the rest.

**Capability identifiers (version 1)**

| Capability          | Meaning                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `widgets`           | Host supports the widget grid described below (including the configuration-panel methods `ui.openConfigPanel` / `ui.closePanel`). |
| `panels.iframe`     | Host supports iframe panels.                                                                                                      |
| `panels.state`      | Host reports whether each loaded panel is on screen (`ui.listPanels`) and emits `panel.state` when that changes. See *Panel state*. |
| `background.iframe` | Host supports headless background-runtime iframes (no UI, loaded while the extension is present).                                 |
| `buttons`           | Host renders extension toolbar buttons in at least one slot.                                                                      |
| `buttons.visibility` | Host lets an extension show and hide its own toolbar buttons (`buttons.setVisibility`) and honours a button's `visible`. Requires `buttons`. See *Showing and hiding buttons*. |
| `actions`           | Host offers manifest `actions` on chart targets — points, stored resources, vessels, aids to navigation, chart features — reports the user's choice (`action.invoked`, `context.invocation`) and lets the extension show and hide its actions (`actions.setVisibility`). See *Actions*. |
| `events.publish`    | Host implements `events.publish` (extension-originated events) and the `scope` option on the `publish` button action. See *Publishing events*. |
| `signalk.stream`    | Host streams Signal K path values to extension contexts over the message bus.                                                     |
| `signalk.put`       | Host relays Signal K PUT requests from extension contexts.                                                                        |
| `units`             | Host exposes the user's preferred display units (`units.get`).                                                                    |
| `map`               | Host implements the `map.*` methods (view query and control) and emits `map.view` when the chart viewport changes.                |
| `map.pick`          | Host implements `map.pick` / `map.cancelPick` (the user picks a point or feature for an extension) and emits `map.picked`. See *Picking on the map*. |
| `resources`         | Host implements `resources.list` (relayed resource queries).                                                                      |
| `resources.filter`  | Host implements imperative resource display filters.                                                                              |
| `routes`            | Host implements live route edit-buffer commands (`route.*`) and emits route lifecycle/mutation events.                            |
| `charts`            | Host implements chart-layer management (`chart.*`) — enumerate the managed charts, toggle visibility/opacity/order — and emits `chart.*` change events. |
| `charts.time`       | Host can retarget a time-varying chart to a chosen instant (`chart.setTime`), reports each chart's time dimension in `chart.list`, and emits `chart.time`. Requires `charts`. |
| `resourceGroups`    | Host can apply a stored resource group (`resourceGroup.apply`) — show the group's routes, waypoints, regions and charts — and emits `resourceGroup.applied`. |
| `nightMode`         | Host implements the `nightMode.*` methods (read/force the night-vision display state, follow the server's `environment.mode`) and emits `nightMode.changed`. |
| `ui`                | Host implements `ui.openPanel` / `ui.closePanel`.                                                                                 |
| `windows`           | Host can show an extension's iframe panels as floating windows (`ui.openWindow` and the other `ui.*Window` methods) and emits `window.*` events. See *Windows*. |
| `overlays.image`    | Host composites map layers whose pixels an extension's background runtime draws (`overlay.*` methods, `overlay.request` / `overlay.state` events). Requires `background.iframe`. See *Map overlays*. |
| `overlays.data`     | Host draws map layers from data and a MapLibre style an extension supplies (`overlay.*` methods including `overlay.refresh`, `overlay.setData`, `overlay.setLayer` and `overlay.setState`; `overlay.state` events). See *Data overlays*. |
| `actions.overlay`   | Data-overlay features can be made selectable and are `overlayFeature` targets for their extension's actions. Requires `actions` and `overlays.data`. See *Interactive overlay features*. |

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

**Lifecycle.** A widget instance is loaded while it is placed and its
extension is available, and unloaded when the user removes it or the extension
leaves. `whileEnabled` is the only widget lifecycle and is implied; a host
ignores any other value.

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

- `onOpen` (the default) — load when opened, unload when closed.
- `keepAlive` — load on first open, keep running (hidden) while available;
  panel state survives close/reopen.

A host treats an absent or unrecognized panel `lifecycle` — `whileEnabled`
included — as `onOpen`: a panel is never loaded before it is first opened.
Work that must run from the moment the extension is available, with no user
interaction, belongs in a background runtime (see *Background Runtimes*).

Panels are opened by toolbar buttons, by the host methods `ui.openPanel` /
`ui.togglePanel` (e.g. a widget tap), or — for configuration panels — by
`ui.openConfigPanel` / `ui.toggleConfigPanel`. The `toggle*` variants close
the panel if it is already the active one, otherwise open it. The reference
host shows general panels in a right-side drawer that pushes the chart
aside, and configuration panels in a dialog.

With the `windows` capability, an extension can also show any of its iframe
panels in a floating window over the chart, several at once; see *Windows*.
With `panels.state`, an extension can follow whether each of its loaded panels
is on screen, for example to pause a hidden `keepAlive` panel; see *Panel
state*.

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
`map.*`, `ui.openPanel`/`ui.togglePanel`, `ui.listPanels` (see *Panel
state*), the window methods (`ui.openWindow` and the rest; see *Windows*), and
`overlay.*` (see *Map overlays*); it is the only context that receives
`overlay.request`, and the usual place to drive a data overlay's live changes. It has no `ui.closePanel` or
`ui.*ConfigPanel` (those are panel/widget affordances). The typical use is a
client-side service that holds session state and keeps work alive so a panel
can **close itself** (`ui.closePanel`) without losing that state, then
reattach to the runtime's state when reopened.

`whileEnabled` is the only meaningful lifecycle for a runtime and is implied;
the host does not unload a runtime on its own while the extension is present.

To **trigger** a runtime, the runtime subscribes to a topic with
`events.subscribe` and a `publish` button (see Buttons) or another of the
extension's contexts (`events.publish`, see *Publishing events*) publishes that
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
- `visible` — whether the button is shown before the extension says otherwise
  (capability `buttons.visibility`; see *Showing and hiding buttons*). Default
  `true`. A host without `buttons.visibility` ignores it and always shows the
  button.
- `action` — what the button does:

  - `togglePanel` — open the named `panel` from the same manifest, or close
    it if it is already the active panel (recommended; matches the host's
    built-in panel-button behavior).
  - `openPanel` — always open (or switch to) the named `panel`.
  - `openWindow` — open the named `panel` in a floating window (capability
    `windows`). The action may carry any `ui.openWindow` option besides
    `panel` (`params`, `title`, `geometry`, `modal`, `userClose`,
    `restoreKey`, …). A button keeps track of the window it opened: while that
    window is open, pressing the button again shows and raises it instead of
    opening another.

    ```json
    {
      "id": "show-sounder",
      "title": "Echo sounder",
      "slot": "mapToolbar",
      "icon": "waves",
      "action": {
        "type": "openWindow",
        "panel": "viewer",
        "params": { "app": "/signalk-wifish/" },
        "geometry": { "anchor": "bottom-right", "width": 480, "height": 240 },
        "userClose": "hide",
        "restoreKey": "sounder"
      }
    }
    ```

  - `toggleWindow` — like `openWindow`, except that pressing the button while
    its window is shown does what the window's own close control does: hides
    it with `userClose: "hide"`, closes it otherwise.

    A window a button opened is an ordinary window of the extension: its
    contexts see it in `ui.listWindows` and receive its `window.*` events. A
    host that supports `buttons` but not `windows` treats `openWindow` and
    `toggleWindow` as `openPanel` and `togglePanel` of the same `panel`.

  - `publish` — publish a message onto the host bus. The button carries a
    `topic` (the event name), optional `params`, and an optional `scope`
    (`"all"`, the default, or `"extension"`); the host publishes it exactly as
    `events.publish` would on behalf of the button's extension (see
    *Publishing events*). This is fire-and-forget — no reply.

    ```json
    {
      "id": "refresh-pois",
      "title": "Refresh nearby POIs",
      "slot": "mapToolbar",
      "icon": "refresh",
      "action": {
        "type": "publish",
        "topic": "poi-search.refresh",
        "scope": "extension"
      }
    }
    ```

    The **primary use case is to reach the extension's own background
    runtime** — a button poke that a kept-alive headless context handles
    (re-run a search, recompute a filter, etc.), with any visible result
    flowing back through the normal event loop (`state.changed`,
    `filters.changed`, …). With the default `scope: "all"` it is a general
    message: the host delivers the topic to _any_ subscribed context, so it can
    also drive a panel or, across extensions, let a federation of plugins
    coordinate. `scope: "extension"` keeps it to the button's own extension.

  - `sendMessage` — **deprecated** alias of `publish`, kept permanently for
    manifests written before `publish` existed. A host that supports `buttons`
    **MUST** accept it and treat it exactly as `publish`. New manifests
    **SHOULD** use `publish`; one that must also work on a host without the
    `events.publish` capability uses `sendMessage` and omits `scope` (such a
    host delivers to every subscribed context, i.e. `scope: "all"`).

### Showing and hiding buttons

Some buttons only make sense in some states of the extension: "Stop
recording" while a recording runs, "Resolve fix" during a dead-reckoning
session. With the **`buttons.visibility`** capability an extension shows and
hides its own buttons as its state changes, instead of leaving a button on the
toolbar that does nothing.

```json
{ "ids": ["stop-recording"], "visible": false }
```

**`buttons.setVisibility({ ids, visible })`** shows or hides the calling
extension's own buttons and resolves `{}`. A hidden button is removed from its
slot, not greyed out, and the host closes the gap it leaves; a shown one takes
its place again. Hiding a button changes nothing it opened: its panel or window
stays as it is.

Visibility belongs to the extension, not the user, and is not persisted: when
the host loads, every button starts as its manifest `visible` says, and the
extension sets it again from its own state, typically from a background
runtime as it starts. Any of the extension's contexts may call it; the last
call wins. An extension that must also run on a host without
`buttons.visibility` leaves such buttons `visible` (the default) and handles a
press that does not apply.

**Errors** use the standard `error.data.reason` convention: `buttons.badRequest`
(`ids` not a list of strings, or `visible` not a boolean), `buttons.unknownId`
(an id that is not a button of the caller's manifest; nothing is changed),
`buttons.notSupported` (host lacks `buttons.visibility`).

---

## Actions

An extension may contribute **actions**: things the user can do to something
on the chart — a spot, a waypoint, a route, a vessel, a landmark printed on
the chart. An action is declared in the manifest with the kinds of **target**
it applies to; the host offers it wherever it offers its own actions for such a
target, and tells the extension when the user chooses it and on what.
Capability: **`actions`**.

```json
{
  "id": "route-to",
  "title": "Smart route to here",
  "icon": "alt_route",
  "targets": ["position", "waypoint", "note"],
  "action": { "type": "publish", "topic": "auto-route.routeTo", "scope": "extension" }
}
```

An action is declarative. The host builds each menu from the manifest — keeping
the actions whose targets match what the user selected — and never asks a
running extension what to show, so a menu opens as fast as the host's own, and
an action is offered even when none of the extension's contexts is loaded. An
extension whose actions depend on its own state shows and hides them ahead of
time (see *Showing and hiding actions*).

**Action fields**

- `id`, `title` (required) — `title` is plain text; a host never renders it as
  markup.
- `icon` — a Material icon name, as for buttons.
- `targets` (required) — the targets the action applies to (see *Targets*).
- `action` (required) — what choosing it does (see *Choosing an action*).
- `default` — `true` makes this the action a primary select runs directly on an
  overlay feature (see *Interactive overlay features*). It has no effect on
  other targets.
- `visible` — whether the action is offered before the extension says
  otherwise (see *Showing and hiding actions*). Default `true`.

A host omits an action that lacks a required field, and an action none of whose
targets it supports.

### Targets

A target is the thing an action is chosen on. Each entry in `targets` is either
a kind, or an object that names a kind and narrows it:

| Kind             | The target is                                                | Narrowed by |
| ---------------- | ------------------------------------------------------------ | ----------- |
| `position`       | a point on the chart                                         | — |
| `waypoint`       | a stored waypoint                                            | `match` |
| `note`           | a stored note                                                | `match` |
| `route`          | a stored route, or a draft route on the chart                | `match` |
| `track`          | a stored track                                               | `match` |
| `region`         | a stored region                                              | `match` |
| `vessel`         | the own vessel or another vessel (AIS)                       | `self` |
| `aton`           | a Signal K aid to navigation                                 | — |
| `chartFeature`   | a feature of a chart layer, e.g. a landmark or light in an ENC | `match` |
| `overlayFeature` | a feature of one of the extension's own data overlays (capability `actions.overlay`) | `overlays`, `match` |

```json
"targets": [
  "position",
  { "kind": "note", "match": [{ "path": "properties.skIcon", "op": "eq", "value": "anchorage" }] },
  { "kind": "vessel", "self": false },
  { "kind": "chartFeature", "match": [{ "path": "class", "op": "in", "value": ["LNDMRK", "LIGHTS"] }] }
]
```

- **`match`** uses the condition grammar of `resources.setFilter` (see
  *Resource queries and display filters*), symbol-reference tolerance included,
  and an action applies only when every condition holds. The conditions are
  evaluated against data the host already holds, so a menu never waits on a
  fetch:

  - `waypoint`, `note`, `route`, `region` — the stored resource, the same
    object `resources.setFilter` evaluates against. A draft route that was
    never saved is evaluated as `{ "name": … }`.
  - `track` — `{ "name": …, "description": … }`, since a track may come from
    the Track API or from a resource collection, whose objects differ.
  - `chartFeature` — the target object (so `class`, `name` and
    `properties.*`).
  - `overlayFeature` — the extension's feature as `{ "id": …, "properties": … }`,
    the same for a GeoJSON source and a vector source.
- **`self`** — `true` applies only to the own vessel, `false` only to other
  vessels. Without it, both.
- **`overlays`** — limits an `overlayFeature` entry to the listed overlay ids
  of the same manifest.

A host ignores a target entry of a kind it does not know or support, and an
entry that narrows a kind with a field that kind does not take. New kinds can
therefore be added later without breaking older hosts: they simply do not offer
the action for that target. An extension that wants a fallback lists it too:
`["chartFeature", "position"]` is offered on a landmark where the host supports
chart features, and on the spot the user selected where it does not.

`position` is any point on the chart, with or without a feature under it. A
host **MUST** let the user reach `position` actions through its location
context gesture at every point of the chart, whether or not it has actions of
its own there — if it would otherwise show nothing, it shows a menu with only
the extension actions.

### The target object

The target is delivered to the extension as an object:

```jsonc
{
  "kind": "chartFeature",
  "position": [-173.9792, -18.6473],         // where the user selected, [lon, lat]
  "featurePosition": [-173.9826, -18.6473],  // the feature's own position, for a point
  "name": "Communications Tower Mt Talau",
  "chart": { "id": "tonga-enc" },
  "class": "LNDMRK",
  "properties": { "OBJNAM": "Communications Tower Mt Talau", "CATLMK": "17" }
}
```

Every target carries:

- `kind` — one of the kinds above.
- `position` — the point the user selected, `[lon, lat]`. Longitudes are
  always in `[-180, 180]`, as in *Bounding boxes*, whichever copy of the world
  the user was looking at.
- `name` — the target's name, when the host knows one: the resource's name,
  the vessel's or aid's name, the chart feature's object name, or the overlay
  feature's `titleProperty`.
- `featurePosition` — the target's own position when it is a point: a
  waypoint, a note, a vessel or aid where the host last had it, a point
  feature of a chart or overlay. Take bearings and ranges from this, not from
  `position`, which is wherever the user's finger landed.

And by kind:

| Kind | Fields |
| ---- | ------ |
| `position` | — |
| `waypoint`, `note`, `region`, `track` | `id`, `href` |
| `route` | `id` and `href` when stored; `routeId` when it is in the visible set (capability `routes`) |
| `vessel` | `context`, `self` |
| `aton` | `context` |
| `chartFeature` | `chart.id` when the host knows the chart, `class`, `properties` |
| `overlayFeature` | `overlayId`, `source`, `featureId`, `properties` |

- **`href`** is the stored object's path on the server's version 2 API,
  relative to `/signalk/v2/api`, as everywhere in this API:
  `/resources/<type>/<id>` for resources. A track's `href` is where the host
  reads it: `/tracks/<id>` from the Track API, or `/resources/tracks/<id>`
  from a resource collection. A target carries identity, not content: fetch
  the object with `GET /signalk/v2/api` followed by the `href`. **`routeId`**
  is the opaque handle of *Live routes*, so a route action can go straight to
  `route.get` and `route.replace`. A draft that was never saved has only a
  `routeId`, so a host offers route actions on a draft only when it supports
  `routes`.
- **`context`** is the Signal K context, such as
  `vessels.urn:mrn:imo:mmsi:367123450` or `atons.urn:mrn:imo:mmsi:993672001`.
  For the own vessel a host may send `vessels.self`.
- **`class`** is the feature's class: the S-57 object class acronym
  (`LNDMRK`, `LIGHTS`, `BOYLAT` …) for an ENC, the source layer for a vector
  chart. **`properties`** are the feature's attributes as the chart provides
  them — S-57 attribute codes for an ENC, whatever keys a vector chart uses.
  Read them defensively.
- **`featureId`** is the overlay feature's id (see *Interactive overlay
  features*), a string or a number exactly as the extension gave it, and
  **`properties`** its own properties, echoed back so the extension need not
  look the feature up.

The target is a snapshot taken when the user selected. It is not updated, so a
vessel's `featurePosition` is where the host last had it at that moment.

### Where actions appear

The host decides where an action appears and which gesture brings it up; the
extension only says what it applies to. Actions are offered **on the chart**,
for something the user selected on the map, so every target has a selected
`position`. (Offering them from the host's lists and panels is not part of this
version.) There, a host offers an action wherever it offers its own actions for
that target:

- `position` actions in its location context menu — reached by a right-click,
  a long-press, or a keyboard context key, as the host already does;
- actions for a feature in whatever UI the host shows for that feature — a
  popover, a selection card, a context menu on the feature, or several of
  these.

The reference host shows them in its chart context menu and in the feature's
popover.

**Rules a host follows:**

- **The target is identified.** The host makes clear which target the
  extension actions apply to — a menu header or the popover's title naming
  it — so an action's `title` need not repeat the name. "Take bearing" under
  "Communications Tower Mt Talau" is enough.
- **Host items come first.** Extension actions are grouped after the host's own
  and attributed to their extension. They never displace or hide the host's
  own actions. A host may cap how many it shows at once and put the rest in an
  overflow menu.
- **Not during a modal interaction.** While the user is drawing, measuring,
  editing geometry or picking (see *Picking on the map*), the host offers no
  extension actions, as it suppresses its own.
- **Several features under the pointer** are resolved as the host already
  resolves them (a list to choose from, say). Actions apply to the target the
  user chose.

### Showing and hiding actions

`match` decides from the **target** whether an action applies. Some actions
depend on the **extension's** state instead: "Resolve fix" only while a
dead-reckoning session is running, "Radar range" only while the radar
transmits. The extension switches those on and off as its state changes:

```json
{ "ids": ["resolve-fix"], "visible": true }
```

**`actions.setVisibility({ ids, visible })`** shows or hides the calling
extension's own actions and resolves `{}`. A hidden action is offered nowhere,
and a hidden `default` action is not run on a primary select. The change
applies from the next menu or popover the host builds; one already on screen
may keep what it showed. The host never waits on the extension for this, and
the user's selection is never delayed by it.

Visibility belongs to the extension, not the user, and is not persisted: when
the host loads, every action starts as its manifest `visible` says, and the
extension sets it again from its own state, typically from a background
runtime as it starts. Any of the extension's contexts may call it; the last
call wins.

**Errors** use the standard `error.data.reason` convention: `actions.badRequest`
(`ids` not a list of strings, or `visible` not a boolean), `actions.unknownId`
(an id that is not an action of the caller's manifest; nothing is changed),
`actions.notSupported` (host lacks `actions`). An embedding host has no
actions, so every id is unknown to it.

### Choosing an action

`action` takes the same types as a button's (see *Buttons*): `openPanel`,
`togglePanel`, `openWindow`, `toggleWindow` and `publish` (with its deprecated
alias `sendMessage`). An action opens rather than toggles: `togglePanel` and
`toggleWindow` behave as `openPanel` and `openWindow`. A host that supports
`actions` but not `windows` treats `openWindow` as `openPanel`, as it does for
buttons.

When the user chooses an action, the host:

1. **performs the action** on behalf of the extension, as for a button. A
   `publish` action publishes its topic with `actionId` and `target` added to
   its `params`;
2. **emits `action.invoked`** — `{ actionId, target }` — to every context of
   the extension that is already loaded, shown or hidden, and subscribed to it:
   its background runtime, widgets, panels and windows;
3. **hands the invocation to a context the action loads.** A panel or window
   that the action itself loads finds the same `{ actionId, target }` in its
   handshake, as `context.invocation`, so it does not depend on subscribing in
   time to hear the event. It does not also receive `action.invoked` for that
   invocation.

An action keeps track of the window it opened, as a button does: choosing the
action again while that window is open shows and raises it instead of opening
another, and the window hears the new target as `action.invoked`. A loaded
`keepAlive` panel is shown, not reloaded, and hears it the same way.

A `publish` action therefore reaches the extension twice — as its topic and as
`action.invoked` — and the extension listens to whichever suits it.

Together these reach every shape of extension. A background runtime hears the
event. A panel that was closed is loaded and reads its handshake. A window or
`keepAlive` panel that is already loaded hears the event; a reused window's
`params` cannot carry the new target, because they are fixed when it opens.

A `publish` action on a host without `events.publish` is published to every
subscribed context, as a button's is (see *Buttons*); `action.invoked` always
stays within the extension.

```js
const client = await connectExtension()  // the panel the action opens

const show = ({ target }) => planRouteTo(target.featurePosition ?? target.position)

if (client.context.invocation) show(client.context.invocation)
await client.subscribe(['action.invoked'], (_name, inv) => show(inv))
```

An embedding host has no manifest, so it contributes no actions.

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
  Events originate with the host or, through `events.publish`, with an
  extension context; both arrive the same way.
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

`context.kind` is `widget`, `panel`, `window`, `background` or
`embedding-host` (this version). For a configuration panel,
`targetInstance`/`targetWidget` identify the widget being configured, or
`targetOverlay` the overlay being configured (see *Map overlays*); a
`background` runtime and an `embedding-host` carry neither. A `window` context
adds `windowId` and `params` (see *Windows*). A panel or window loaded by the
user choosing one of the extension's actions adds `invocation` —
`{ actionId, target }` (see *Actions*). An `embedding-host` context describes the **caller** — the
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
| `events.publish`        | `{ topic, params?, scope? }`                   | `{}`                       |
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
| `map.pick`              | `{ prompt?, targets? }`                        | `{ pickId }`               |
| `map.cancelPick`        | `{ pickId }`                                   | `{}`                       |
| `actions.setVisibility` | `{ ids: string[], visible: boolean }`          | `{}`                       |
| `buttons.setVisibility` | `{ ids: string[], visible: boolean }`          | `{}`                       |
| `nightMode.get`         | —                                              | `{ enabled, auto }`        |
| `nightMode.set`         | `{ enabled?, auto? }`                           | `{}`                       |
| `ui.openPanel`          | `{ panel }`                                    | `{}`                       |
| `ui.togglePanel`        | `{ panel }`                                    | `{}`                       |
| `ui.openConfigPanel`    | — (widget contexts)                            | `{}`                       |
| `ui.toggleConfigPanel`  | — (widget contexts)                            | `{}`                       |
| `ui.closePanel`         | — (panel contexts)                             | `{}`                       |
| `ui.listPanels`         | —                                              | `{ panels }`               |
| `ui.openWindow`         | `{ panel, params?, title?, geometry?, modal?, resizable?, movable?, titleBar?, userClose?, visible?, single?, restoreKey? }` | window state |
| `ui.updateWindow`       | `{ windowId?, title?, geometry?, visible? }`   | window state               |
| `ui.focusWindow`        | `{ windowId? }`                                | `{}`                       |
| `ui.closeWindow`        | `{ windowId? }`                                | `{}`                       |
| `ui.listWindows`        | —                                              | `{ windows }`              |
| `overlay.list`          | —                                              | `{ overlays }` (own extension's) |
| `overlay.setVisibility` | `{ ids: string[], visible: boolean }`          | `{}`                       |
| `overlay.setOpacity`    | `{ ids: string[], opacity: number }`           | `{}`                       |
| `overlay.frame`         | `{ overlayId, requestId?, extent, image }` (`image` transferred) | `{ accepted, reason? }` |
| `overlay.refresh`       | `{ overlayId, source, tiles? }`                | `{}`                       |
| `overlay.setData`       | `{ overlayId, source, data?, upsert?, remove? }` | `{}`                     |
| `overlay.setLayer`      | `{ overlayId, layer, paint?, layout?, filter? }` | `{}`                     |
| `overlay.setState`      | `{ overlayId, values }`                        | `{}`                       |

**Host events**

These events are part of the API contract — any conforming host emits them,
they are not host-specific. Each is delivered only to contexts that have
subscribed to its name via `events.subscribe` (so a context that never
subscribes pays nothing). A host emits an event when the corresponding
capability is supported: `state.changed` always; `sk.<path>` with
`signalk.stream`; `filters.changed` with `resources.filter`; route events
(`route.*`) with `routes`; chart events (`chart.*`) with `charts` (`chart.time` with `charts.time`);
`resourceGroup.applied` with `resourceGroups`; `map.view` with `map`;
`map.picked` with `map.pick`; `action.invoked` with `actions`;
`nightMode.changed` with `nightMode`; `panel.state` with `panels.state`;
`window.*` with `windows`; `overlay.request` with `overlays.image`, and
`overlay.state` with `overlays.image` or `overlays.data`. The
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
- `map.picked` — `{ pickId, target }` or `{ pickId, cancelled, reason }`: a pick
  the context asked for with `map.pick` ended. Delivered only to that context.
  See *Picking on the map*.
- `action.invoked` — `{ actionId, target }`: the user chose one of the
  extension's actions. Delivered only to the owning extension's contexts. See
  *Actions*.
- `nightMode.changed` — `{ enabled, auto }`: the host's night-mode state changed.
  Like the route and chart events it is **origin-transparent** — emitted for
  *every* change, whether an extension called `nightMode.set`, the user toggled
  the host's own night-mode control, or the server's `environment.mode` flipped
  while `auto` is on. See *Night mode*.
- `panel.state` — `{ panel, visible, collapsed, targetInstance?, targetOverlay? }`: one of the
  extension's loaded panels was shown or hidden, or collapsed or expanded.
  Origin-transparent, and delivered only to the owning extension's contexts.
  See *Panel state*.
- `window.bounds` — `{ windowId, bounds, area }`: a window's actual geometry
  changed (a user move or resize ended, `ui.updateWindow`, or the host re-clamped
  it). Delivered only to the owning extension's contexts. See *Windows*.
- `window.state` — the full window state, when a window's visibility, collapse,
  pop-out, presentation or title changed. Owning extension only.
- `window.closed` — `{ windowId, reason }`: a window closed (`reason` is `user`,
  `extension` or `host`). Owning extension only.
- `overlay.request` — `{ overlayId, requestId, extent, bounds, width, height,
  pixelRatio, resolution, zoom, rotation, liveInterval? }`: the host wants a new frame for a
  visible overlay. Delivered only to the background runtime named by the
  overlay. See *Map overlays*.
- `overlay.state` — `{ overlayId, visible, opacity, suspended }`: an overlay was
  shown, hidden, faded, suspended or resumed. Origin-transparent; owning
  extension only. See *Map overlays*.

### Publishing events

`events.publish` (capability `events.publish`) lets an extension context put
an event of its own onto the bus — the publish half of the pub/sub that
`events.subscribe` already provides. A panel can notify the extension's
background runtime, several widget instances can keep each other in sync, and
cooperating extensions can coordinate over shared topics.

```json
{ "topic": "poi-search.results", "params": { "count": 12 }, "scope": "extension" }
```

- **`topic`** — the event name, delivered as the notification's `method`.
  It is a literal name: it **MUST** be a non-empty string and **MUST NOT**
  contain the wildcard character `*` (it belongs to subscription patterns).
- **`params`** — optional payload, delivered as the notification's `params`
  unchanged. It must be structured-cloneable (it crosses `postMessage`).
- **`scope`** — who may receive it:
  - `"all"` (default) — every live context on the host's bus that subscribed
    to a matching pattern, in any extension, including an embedding host.
  - `"extension"` — only the publishing extension's own subscribed contexts
    (its widgets, panels, windows and background runtime). For an embedding
    host, its own connection is its extension.

The host delivers the event to every context in scope whose subscriptions
match — **including the publishing context itself** if it subscribed — and
then returns `{}`. Delivery is fire-and-forget: there is no reply from
receivers, the result does not say whether anyone heard it, and an unheard
topic simply does nothing.

A published event is **indistinguishable from a host event**: it carries no
sender identity, and the host does not reserve or validate topic names beyond
the rules above. That is deliberate — an extension that changes something
through the server directly (say, edits a stored route) may publish the
matching host event (`route.saved`) so other contexts react as if the host had
emitted it. The flip side is that receivers cannot tell who published a topic.
A publisher that needs to identify itself puts that in `params`.

Topics of an extension's own **should** be namespaced with a dotted prefix,
`<extension-id>.<name>` (e.g. `poi-search.refresh`). Because wildcards match
whole dot-separated segments, one subscription to `poi-search.*` then catches
every topic of the extension; a colon-joined name such as `poi-search:refresh`
is a single segment that no prefix pattern matches. Colon-joined names remain
valid topics and hosts **MUST** accept them — this is a **convention, not an
enforced requirement**.

`scope: "extension"` makes collisions matter less than they would on a shared
bus: such a publish never reaches another extension, whatever its name. A
namespace still protects the receiving side, since a context's subscriptions
also match `scope: "all"` events that other extensions publish under the same
name, and keeps an extension's own topics clear of host event names.

The `bus.*` names (`bus.ready`, `bus.handshake`) belong to the connection
protocol and are not published through this method.

The `publish` button action (see *Buttons*) is the same operation, triggered by
the user instead of by code, on behalf of the button's extension.

**Errors** use the standard `error.data.reason` convention: `events.badRequest`
(missing or empty `topic`, a `topic` containing `*` or in the `bus.*`
namespace, an unknown `scope`).

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
is `{ position: [lon, lat, alt?], name?, description?, href? }` —
`name`/`description`/`href` map to a host's per-point metadata and round-trip
through `route.get`, `route.replace`, and `route.save`. `route.create` and
`route.replace` require at least two points and reject a malformed point (a
non-numeric `position`, a non-string `name`/`description`, or an `href` that is
not a waypoint reference) with `routes.badRequest`.

**Waypoint links.** `href` links a point to a saved waypoint, as a Signal K
resource path: `/resources/waypoints/<id>`. This is the same reference a Signal K
route stores in its per-point metadata, so a point that is linked on the server
arrives linked in `route.get`, and `route.save` stores the link again.

- **A link is a reference, not a copy.** `position` alone defines the route's
  geometry, and a point's own `name`/`description` stay its own. A linked point
  may also carry a `name`; one that doesn't may be labelled with the waypoint's
  name wherever it is shown.
- **The host does not keep the point and its waypoint in step.** A client that
  moves a linked point off its waypoint should drop the `href` (or link the
  point to a different waypoint). Moving the waypoint itself later does not move
  the route point.
- **A link can outlive its waypoint.** A host need not check that the waypoint
  exists when it accepts or saves an `href`. Treat a link that no longer
  resolves as no link.
- Adding, changing or removing only a point's `href` is still a content change:
  it emits `route.dirty` and bumps `rev` like any other edit.

**Older hosts.** `href` was added after the `routes` capability. A host built
against the earlier contract never reports it and drops it when it copies points,
so a link set through `route.create` or `route.replace` is lost and the point is
saved unlinked. Nothing on the wire tells the two hosts apart. An extension that
depends on links can call `route.get` after its write and check that the `href`
is still there.

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
- `forecast: true` (optional) says the frames are a forecast: every one from
  `from` to `to` (or every listed value) exists already, the ones ahead of now
  included. A host's own time control then lets the user step and play ahead
  of now, and `null` is still the frame for the present. Without it a host
  takes frames after now as not there yet, as for a rolling product whose
  declared `to` runs ahead of the present.
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

### Picking on the map

With an action, the user starts and the extension responds. A **pick** is the
other way round: the extension asks the user to choose something on the chart
— "Tap the destination", "Select the waypoint to route to" — and the host
hands back what the user chose. Capability: **`map.pick`**.

```json
{ "prompt": "Select the waypoint to route to", "targets": ["waypoint"] }
```

**`map.pick`** puts the host into a pick, and returns `{ pickId }` at once.
The answer comes later as the `map.picked` event, so the call is not held open
while the user thinks — subscribe to `map.picked` before calling:

```js
await client.subscribe(['map.picked'], (_name, picked) => {
  if (picked.cancelled) return
  routeTo(picked.target)
})
const { pickId } = await client.call('map.pick', { prompt: 'Tap the destination' })
```

- **`prompt`** — plain text the host shows while the pick is on. Without it
  the host shows its own wording.
- **`targets`** — what may be picked, in the same form as an action's
  `targets` (see *Actions*), `match` and `self` included. Without it, a point:
  `["position"]`. With feature kinds only, a select that lands on no matching
  feature is ignored and the pick stays on; with `position` among them, it
  yields the matching feature if there is one, and the point otherwise.

While a pick is on, the host shows the prompt and a way to cancel. The next
primary select (a tap or a click) on something the pick accepts ends it and
does nothing else: it opens no popover and adds no point. The user can still
pan and zoom the chart to find what they want.

**`map.picked`** goes to the context that asked:

- `{ pickId, target }` — the user picked; `target` is a target object (see
  *The target object*).
- `{ pickId, cancelled: true, reason }` — no pick. `reason` is `user` (the
  user cancelled), `extension` (`map.cancelPick`), `superseded` (another pick
  replaced this one) or `host` (the host ended it, for example because the
  user started drawing a route).

One pick is on at a time, host-wide. A new `map.pick`, from any context,
supersedes the one already on. A pick lasts for one select: to pick several
things in turn, call `map.pick` again after each `map.picked`. A host ends the
pick of a context that unloads, without an event.

**`map.cancelPick({ pickId })`** ends the caller's pick if it is still on, and
resolves `{}` either way. A context cannot cancel another context's pick.

`map.pick` does not require `actions`; it only shares the target vocabulary.
An `overlayFeature` entry needs `actions.overlay`, and picks only among the
caller's own interactive overlays. When several pickable things are under the
pointer, the host resolves them as it does for actions (see *Where actions
appear*).

**Errors** use the standard `error.data.reason` convention: `map.badRequest`
(a malformed `targets`, or one with no kind the host supports),
`map.pickBusy` (the user is in a modal interaction — drawing, measuring or
editing — that a pick must not interrupt), `map.notSupported` (host lacks
`map.pick`).

### Map overlays

A **map overlay** is a map layer an extension contributes. There are two kinds:

- An **image overlay** (`overlays.image`) is a layer whose pixels the extension
  draws. The host decides *where* and *when*; the extension decides *what*.
- A **data overlay** (`overlays.data`) is a layer the host draws from data and a
  style the extension supplies. See *Data overlays*.

Both kinds are declared in the same `overlays` manifest section, sit in the same
bands, and are shown, hidden and faded the same way. This section describes
image overlays and what the two kinds share; *Data overlays* covers the rest.

For an image overlay, the host places the overlay in its own layer stack, asks
the extension for a frame whenever the view needs one, and composites the image
it gets back — a live depth survey, a radar picture, a heatmap. Capability:
**`overlays.image`**.

An image overlay is drawn by one of the extension's **background runtimes** (see
*Background Runtimes*), so an extension that contributes one requires
`background.iframe` as well. The host draws the map; the runtime only turns its
own data into an image for the box the host asks for. It needs no map library of
its own.

#### Declaring an overlay

Overlays are declared in an `overlays` manifest section:

```jsonc
{
  "requires": ["background.iframe", "overlays.image"],
  "background": [
    { "id": "renderer", "type": "iframe",
      "url": "/plotterext/signalk-livedepth-plugin/renderer.html" }
  ],
  "overlays": [
    {
      "id": "depth",
      "title": "Live depth",
      "type": "image",
      "runtime": "renderer",     // the background runtime that draws it
      "band": "aboveCharts",     // aboveCharts | aboveResources
      "visible": true,           // initial visibility, before the user chooses
      "opacity": 0.85,           // initial opacity, 0..1
      "minZoom": 10,             // optional: no requests below this zoom
      "maxZoom": 22,             // optional: no requests above this zoom
      "configPanel": "depth-settings", // optional: a panel of this manifest
      "preferredPixelRatio": 2   // optional: the density it looks right at
    }
  ]
}
```

`id`, `title` and `type` are required. `type` is `"image"` or `"data"`, and a
host omits overlays of a type it does not support. An image overlay also requires
`runtime`, which must name an entry in the same manifest's `background` section,
or the host omits the overlay. `runtime` and `preferredPixelRatio` apply to image
overlays only; a data overlay declares a `style` instead (see *Data overlays*).

**Configuration.** An overlay may name a panel from the same manifest via
`configPanel`, for the settings that shape what it draws (a depth source, a
colour range, a contour interval). The host offers it from the overlay's own
entry in its layer controls — next to show, hide and fade — so the settings sit
with the layer the user is looking at. It opens the named panel with
`context.targetOverlay` set to the overlay's id; `targetInstance` and
`targetWidget` are null, and the panel's `state.*` defaults to the extension
scope, since an overlay has no instance. An overlay is hidden, never removed, so
unlike a widget's configuration dialog this one carries no remove affordance.
A `configPanel` that names no iframe panel of the manifest is ignored.

**Density.** `preferredPixelRatio` is the pixel density the overlay looks right
at — `2` for sharp contour lines, `1` for smooth shading that need not cost the
memory. A host uses it instead of the screen's density, still within its own
budget (see *Visibility and the host's budget*), so a request may still come at
a lower ratio. Without it the host chooses.

The host lists each overlay in its own layer controls, where the user shows,
hides and fades it like any other layer. Those choices belong to the user and
the host persists them; `visible` and `opacity` are only the starting point.
Overlays are their own managed set — they are not charts and do not appear in
`chart.list`.

#### Placement

`band` says where the overlay sits relative to the host's own content. The host
honours it within its own constraints, as with `chart.setOrder`:

| Band | Above | Below |
|---|---|---|
| `aboveCharts` | every chart, and the host's weather and current layers | the host's radar, routes, waypoints and other resources |
| `aboveResources` | routes, waypoints, notes and regions | the own vessel, AIS targets and alarms |

An overlay never covers the own vessel, alarm indications or AIS targets — that
rule outranks the table. A host whose own stacking cannot satisfy both rows (its
alarm or vessel layers sit below its routes and waypoints, say) keeps the rule
and places the overlay lower; the reference host does this for
`aboveResources`. Several overlays in one band stack in an order the host
chooses.

#### The frame cycle

The host drives. A runtime subscribes to `overlay.request` (and usually
`overlay.state`) with `events.subscribe`. While an overlay is visible, the host
emits **`overlay.request`** to the overlay's runtime whenever it needs a new
frame: the view settled after a pan or zoom, the map was resized, the overlay
became visible, or the view rotated past a threshold the host chooses. The
runtime draws and answers with **`overlay.frame`**.

```jsonc
// event overlay.request (host → the overlay's runtime)
{
  "overlayId": "depth",
  "requestId": "r-41",
  "extent": [-8928500.2, 2971100.7, -8921300.9, 2976050.1], // EPSG:3857 metres
  "bounds": [-80.205, 25.771, -80.140, 25.811],              // the same box, lon/lat
  "width": 1600,                   // pixels to draw
  "height": 1100,
  "pixelRatio": 1,                 // image pixels per CSS pixel, chosen by the host
  "resolution": 4.5,               // metres per image pixel
  "zoom": 15.2,
  "rotation": 0.35,                // radians clockwise — advisory, see Rotation
  "liveInterval": 200              // optional: least ms between accepted live frames
}
```

```js
// runtime → host
const res = await client.call(
  'overlay.frame',
  { overlayId: 'depth', requestId: req.requestId, extent: req.extent, image },
  { transfer: [image] }
)
// res → { accepted: true }  or  { accepted: false, reason: 'overlays.superseded' }
```

**The image** is an `ImageBitmap` of `width` × `height` pixels with
premultiplied alpha, transparent wherever the overlay has nothing to show. It is
**transferred**, not copied: after the call the runtime no longer owns it, and
the host closes it when it is replaced. A frame whose size does not match its
request is refused with `overlays.badRequest`.

**The geometry.** The image covers a **north-up, axis-aligned box in Web
Mercator (EPSG:3857)**, with its pixels spaced **evenly in Mercator metres**:
row 0 is the north edge (`extent[3]`), column 0 the west edge (`extent[0]`), and
`resolution` is `(extent[2] - extent[0]) / width`. An image whose rows are
spaced evenly in *latitude* is wrong — it drifts visibly over a large box.
`bounds` (in the convention of *Bounding boxes*) is supplied only as a
convenience for looking data up.

**Across the antimeridian** the host sends one continuous box: `extent` may run
past ±20037508.34 m, and `bounds` then has `west` greater than `east`. The
runtime draws it as one image and wraps its own longitude lookups. Which copy of
the world is on screen is the host's concern; the runtime never sees it.

**One frame in flight.** `overlay.frame` resolves once the host has taken the
frame, so a runtime awaits each result before sending the next. When a newer
request has replaced the one a frame answers, the host may refuse it
(`accepted: false`, `overlays.superseded`); the runtime simply draws the newer
request.

**Live updates.** A runtime whose data changes — a new sounding, a new radar
sweep — may send a frame **without** a `requestId` at any time, for the extent
of the most recent request it received. The host may drop live frames to keep
its own pace (`accepted: false`, `overlays.throttled`). A host that knows its
pace says so in each request's `liveInterval`: the least time, in
milliseconds, it leaves between live frames it accepts, so a runtime can pace
itself instead of learning from refusals. Absent means the host does not say.

**Between frames** the host keeps showing the last accepted frame, moved and
scaled with the map during a gesture, so the overlay never blanks while the
runtime draws.

#### Rotation

The runtime always draws **north-up**; the host rotates the image with the map.
When the map is rotated (heading-up, course-up) the host requests the north-up
box that contains the whole rotated screen, so the image is larger than the
screen — about 1.6× the pixels on average and 2× at 45°.

`rotation` is **advisory**. A runtime that draws text or symbols can use it to
turn each label back to horizontal around its anchor, so labels read upright on
screen; anything else ignores it. The host re-requests only once rotation has
moved past its threshold, not on every degree of yaw.

#### Visibility and the host's budget

- **`overlay.state`** — `{ overlayId, visible, opacity, suspended }` — is emitted
  when the overlay is shown, hidden or faded (by the user or by
  `overlay.setVisibility` / `overlay.setOpacity`), and when the host suspends or
  resumes it. While `visible` is false or `suspended` is true the host sends no
  requests; the runtime should stop drawing and **release its graphics
  resources** (for WebGL, lose its context). A hidden or suspended data overlay
  is not drawn and its sources are not fetched.
- **The host owns the budget.** It chooses `pixelRatio` — following the
  overlay's `preferredPixelRatio` where it can, or the screen's density, and
  lower when needed to save memory — and may cap how many overlays are active at
  once, suspending the rest.
- **Draw off the main thread.** On several engines an extension iframe shares
  the host page's main thread, so heavy drawing in the runtime stalls the whole
  plotter. Render in a Web Worker (`OffscreenCanvas`, then
  `transferToImageBitmap()`) and transfer the result.

#### Methods

- `overlay.list` → `{ overlays }`: this extension's overlays, each
  `{ id, title, type, band, visible, opacity, suspended }`, plus
  `skippedLayers` for a data overlay (see *Data overlays*). A host without
  `overlays.data` may leave out `type`; read a missing one as `image`.
- `overlay.setVisibility({ ids, visible })` and `overlay.setOpacity({ ids,
  opacity })` — the same batch shape as the chart methods; each change emits
  `overlay.state`. They apply to overlays of either kind.
- `overlay.frame({ overlayId, requestId?, extent, image })` → `{ accepted,
  reason? }`, with `image` in the transfer list. Image overlays only.
- `overlay.refresh`, `overlay.setData`, `overlay.setLayer` and
  `overlay.setState` — data overlays only; see *Data overlays*.

An extension sees and controls **only its own overlays**: an `overlay.*` id that
names another extension's overlay is `overlays.unknownId`.

**Errors** use the standard `error.data.reason` convention:
`overlays.unknownId`, `overlays.badRequest` (missing or invalid params; an
`image` that is not an `ImageBitmap`, or a size that does not match its
request; a method used on the wrong kind of overlay; a source or layer id the
overlay's style does not have), `overlays.unsupported` (a data-overlay change
the host cannot draw — see *Data overlays*), `overlays.notSupported` (host lacks
the capability for the overlay's kind). A refused frame is a result, not an
error: `overlays.superseded` or `overlays.throttled`.

### Data overlays

A **data overlay** is a map layer the host draws from data and a style the
extension supplies. The extension says *what* to draw and *how it should look*;
the host draws it with its own map stack, sharing its graphics resources with
the rest of the map. No extension code runs to draw a frame, and an extension
needs no runtime at all unless its data changes while it is shown. Capability:
**`overlays.data`**.

The style language is the **MapLibre Style Spec**, version 8, within the limits
this section sets. A host that does not render with MapLibre translates the
style into its own renderer; the extension never sees the difference.

Everything in *Map overlays* that is not specific to images applies here too:
the `overlays` manifest section, `band` and the safety rule that outranks it,
`visible`, `opacity`, `minZoom`, `maxZoom`, `configPanel` and
`context.targetOverlay`, the user's layer controls, `overlay.state`,
`overlay.list`, `overlay.setVisibility`, `overlay.setOpacity` and the host's
budget.

#### Declaring a data overlay

```jsonc
{
  "requires": ["overlays.data"],
  "optional": ["background.iframe", "signalk.stream", "units"],
  "background": [
    { "id": "live", "type": "iframe",
      "url": "/plotterext/signalk-livedepth-plugin/live.html" }
  ],
  "overlays": [
    {
      "id": "depth",
      "title": "Live depth",
      "type": "data",
      "band": "aboveCharts",
      "visible": true,
      "opacity": 0.85,
      "minZoom": 8,
      "configPanel": "depth-settings",
      "style": "/plotterext/signalk-livedepth-plugin/depth-style.json"
    }
  ]
}
```

`style` is required. It is either a URL (see *Source URLs*) or the style object
itself. A host that cannot load the style, or finds it is not a version-8 style,
omits the overlay. `runtime` and `preferredPixelRatio` do not apply to a data
overlay. Live changes come from any of the extension's contexts; this example's
background runtime is optional, so without it the overlay still draws, it just
does not change while shown.

#### The style

```jsonc
{
  "version": 8,
  "state": {
    "unitFactor": { "default": 1 },   // metres → the user's depth unit
    "safetyDepth": { "default": 3 }   // metres
  },
  "sources": {
    "depth": {
      "type": "raster-dem",
      "tiles": ["/plotterext/signalk-livedepth-plugin/dem/{z}/{x}/{y}.png"],
      "encoding": "terrarium",
      "tileSize": 256,
      "maxzoom": 18
    },
    "contours": {
      "type": "vector",
      "tiles": ["/plotterext/signalk-livedepth-plugin/contours/{z}/{x}/{y}.pbf"],
      "maxzoom": 16
    },
    "soundings": {
      "type": "geojson",
      "data": { "type": "FeatureCollection", "features": [] }
    }
  },
  "layers": [
    { "id": "shading", "type": "color-relief", "source": "depth",
      "paint": { "color-relief-color": ["interpolate", ["linear"], ["elevation"],
        -32768, "rgba(0,0,0,0)", -201, "rgba(0,0,0,0)",
        -200, "#9cc8ec", -5, "#cfe6f7", 0, "#f2f8fc"] } },
    { "id": "isobars", "type": "line", "source": "contours",
      "source-layer": "contours",
      "paint": { "line-color": "#5d7f99", "line-width": 0.8 } },
    { "id": "shoals", "type": "circle", "source": "soundings",
      "filter": ["<", ["get", "depth"], ["global-state", "safetyDepth"]],
      "paint": { "circle-radius": 4, "circle-color": "#d0453a" } },
    { "id": "labels", "type": "symbol", "source": "soundings",
      "layout": {
        "text-field": ["number-format",
          ["*", ["get", "depth"], ["global-state", "unitFactor"]],
          { "max-fraction-digits": 1 }],
        "text-size": 11
      } }
  ]
}
```

- **What the host reads.** A style carries `version`, `sources` and `layers`,
  and optionally `state`. The host ignores the rest — `glyphs`, `sprite`,
  `center`, `zoom`, `bearing`, `pitch`, `light`, `sky`, `terrain`,
  `projection`, `transition` and the like — because the map is the host's.
  (The Style Spec's own validator rejects a `text-field` without a `glyphs`
  URL. Include one if you validate your style that way; the host ignores it.)
- **Ids belong to the overlay.** Source and layer ids are scoped to the overlay
  that declares them: two overlays, or an overlay and the host's own layers,
  may use the same id without clashing. A host that needs globally unique ids
  renames them internally. Ids that begin with `__` are reserved for hosts.
- **Order.** Layers draw in array order, the first lowest, all of them within
  the overlay's band.
- **Visibility.** A layer's `layout.visibility` hides that one layer; the
  user's show and hide of the overlay applies on top of it.
- **Zoom.** Layer and source `minzoom` / `maxzoom` mean what they mean in the
  Style Spec (past a source's `maxzoom` the host over-zooms its tiles). The
  overlay's own `minZoom` and `maxZoom` apply on top.

#### What a host draws

A host with `overlays.data` draws this core:

| | Core |
|---|---|
| Sources | `raster-dem`, `raster`, `vector` (Mapbox Vector Tiles), `geojson` |
| Layers | `color-relief`, `raster`, `fill`, `line`, `circle`, `symbol` (text) |
| Expressions | the version-8 expression language, including `global-state`, wherever the Style Spec allows an expression in these layers, with the limits under *Depth and other grids* |

Outside the core a host may draw more, or not. Other layer types (`hillshade`,
`heatmap`, `fill-extrusion`, `background`), anything that needs a sprite
(`icon-*`, `fill-pattern`, `line-pattern`, the `image` expression), a TileJSON
`url` in place of `tiles`, and `"scheme": "tms"` are all optional.

**A host draws a layer exactly or not at all.** It skips any layer it cannot
draw as written — a layer type it lacks, a property or expression it cannot
reproduce, a source it cannot use — and never draws a layer with some of its
properties silently dropped. It reports each skipped layer in the overlay's
`overlay.list` entry:

```jsonc
"skippedLayers": [
  { "id": "relief", "reason": "layerType", "detail": "hillshade" }
]
```

`reason` is `layerType`, `property` or `source`; `detail` is optional text for a
person reading a log. An empty list means every layer is drawn. An extension
that wants a fallback declares it as a second layer with
`"visibility": "none"` and shows it with `overlay.setLayer` when the first one
is reported skipped.

The one exception is the font. A host draws text in a font of its own choosing;
`text-font` is a preference, and ignoring it is not a reason to skip a layer.

#### Depth and other grids

A grid — depth, a weather field, any value per cell — travels as a `raster-dem`
source and is drawn with a `color-relief` layer.

- **Encoding.** `mapbox` (the default), `terrarium` or `custom` (with
  `redFactor`, `greenFactor`, `blueFactor` and `baseShift`), as the Style Spec
  defines them. Values are metres of elevation, so **depth is negative
  elevation**: a sounding of 4.2 m is −4.2. Tiles are square, and `tileSize`
  defaults to 512 as in the Style Spec; declare `256` if that is what you
  serve.
- **The colour ramp.** `color-relief-color` must be a top-level
  `["interpolate", ["linear"], ["elevation"], …]` with **literal number stops**
  in ascending order. `step`, `global-state`, a computed input such as
  `["-", ["elevation"], 2]` and other interpolation types are not allowed there.
  MapLibre's own renderer ignores them or draws nothing, so a style that uses
  them would not draw the same on every host. Colours blend linearly between
  stops, and a value beyond the last stop takes that stop's colour. For a hard
  edge, put two stops close together:

  ```jsonc
  // draft 2.0 m, 1 m margin: red shallower than the keel, amber inside the margin
  "color-relief-color": ["interpolate", ["linear"], ["elevation"],
    -32768, "rgba(0,0,0,0)",  -201,  "rgba(0,0,0,0)",   // no data
    -200,   "#9cc8ec",        -3.0,  "#d6ebf8",
    -2.999, "#f2c14e",        -2.0,  "#f2c14e",
    -1.999, "#d0453a",         0,    "#d0453a"]
  ```

- **No data.** The Style Spec has no "no data" value. A `raster-dem` pixel's
  value is in its colour channels, not its alpha, and hosts differ on alpha:
  MapLibre ignores it, while a host may draw a fully transparent pixel as empty
  (one way to draw a missing tile). Rely on neither. Serve opaque pixels, and
  encode a cell with no data as a value below any real one — terrarium black,
  −32768 m, is the natural choice — and give it transparent stops, as above. A host blends between neighbouring cells, so at
  the edge of the data the blend passes through every colour between the
  sentinel and the real value. Put the last transparent stop just below the
  deepest value you will ever show (−201 above), and that passage is too thin
  to see. For a tile with no data at all, answer 404 or 204; the host treats a
  missing tile as empty.
- **Moving the colours.** Stops are literals, so a ramp that follows draft,
  tide or a safety depth is rebuilt by the extension and sent with
  `overlay.setLayer` whenever those change. The host swaps the ramp without
  fetching any tile again.

#### Lines, points and labels

- **Contours.** The Style Spec has no contour layer, so contours travel as line
  features — a `geojson` source, or `vector` tiles for a large area — that the
  extension or its plugin generates from its grid. Draw them with `line`, and
  label them with a `symbol` layer whose `symbol-placement` is `line`.
- **Points.** Soundings, shoals and other points are features drawn with
  `circle` and labelled with `symbol`.
- **Numbers in the user's units.** Data stays in SI. To label in the user's
  unit, multiply by a factor held in a `global-state` variable, and set it
  from `units.get` (see *Unit preferences*).

#### Runtime variables

The style's root `state` declares variables and their defaults. Expressions read
them with `["global-state", "<name>"]` in the paint, layout and filter
properties of `fill`, `line`, `circle` and `symbol` layers. A `color-relief`
ramp cannot read them (see *Depth and other grids*).

`overlay.setState({ overlayId, values })` sets one or more variables; a value of
`null` restores the default. Variables belong to the overlay, so their names
never collide with another overlay's or the host's. The host supplies none of
its own: whatever an extension needs — the user's units, the vessel's draft,
night mode — it reads through the host API and sets itself.

#### Source URLs

The URLs in a data overlay are its `style` URL, each source's `tiles`
templates (with `{z}`, `{x}` and `{y}`, in the XYZ scheme), and a `geojson`
source's `data` when that is a URL rather than an inline object. The host
fetches them itself:

- A **server-relative** path (`/plotterext/<plugin-id>/…`, or any other path
  on the Signal K server) is resolved against the server the host is connected
  to and fetched **with** the user's credentials. A plugin normally serves its
  data from its own public path.
- An absolute **`https://`** URL is fetched **without** credentials.
- Anything else makes the source unusable. Its layers are skipped with reason
  `source`, and a style URL of that kind means the host omits the overlay.

#### Live changes

Any of the extension's contexts may change its data overlay. Usually it is a
background runtime that follows a live feed. All four methods resolve to `{}`
once the host has taken the change. The host applies changes in its own time
and may merge several into one redraw.

- **`overlay.refresh({ overlayId, source, tiles? })`** — fetch again.
  `tiles` lists tiles as `[z, x, y]`, as substituted into the source's
  template, and only those are fetched again. Without `tiles` the host fetches
  the whole source again; for a `geojson` source with a URL, that is how to
  reload it. A host fetches a refreshed tile afresh, bypassing any cached copy;
  a listed tile it does not hold is simply fetched fresh when it is next
  needed. Serve tiles that change with `Cache-Control: no-cache`.

  A runtime that folds a new sounding into the grid each second refreshes only
  the tiles that sounding touched, not the whole source.

- **`overlay.setData({ overlayId, source, data })`** replaces every feature of
  a `geojson` source. **`overlay.setData({ overlayId, source, upsert?, remove?
  })`** changes some of them. `upsert` is a list of features, each with a
  top-level `id`, that are added or replace the feature with that id. `remove`
  is a list of ids. `data` cannot be combined with `upsert` or `remove`, and
  `setData` on a source that is not `geojson` is `overlays.badRequest`.

- **`overlay.setLayer({ overlayId, layer, paint?, layout?, filter? })`** —
  change one layer. Each property named in `paint` or `layout` replaces that
  property, and a value of `null` restores what the style declared. `filter`
  replaces the layer's filter; `filter: null` removes it. A change the host
  cannot draw is refused with `overlays.unsupported`, and the layer stays as
  it was. This is how a ramp follows draft and tide, and how an extension
  recolours its layers for night mode.

- **`overlay.setState({ overlayId, values })`** — see *Runtime variables*.

Changes made while the overlay is hidden or suspended are kept and take effect
when it is shown. A host that keeps tiles while the overlay is hidden fetches
them again when it shows the overlay, so a change made meanwhile is never lost.

#### Opacity and night mode

The overlay's opacity, chosen by the user or set with `overlay.setOpacity`,
fades the whole overlay on top of the style's own opacities. How it is
composited is the host's choice: one fade of the whole layer, or each layer's
own opacities scaled. A host that dims or tints its whole map for night vision
does the same to data overlays. Recolouring beyond that is the extension's:
subscribe to `nightMode.changed` and send the night colours with
`overlay.setLayer`.

#### Interactive overlay features

By default the features of a data overlay are drawn, not interactive: a click
on one goes to whatever lies beneath. With the **`actions.overlay`**
capability an overlay can opt in, so the user can select its features and
choose the extension's actions on them (see *Actions*). A marker a plugin draws
then behaves like a waypoint the host draws.

```jsonc
{
  "id": "buoys",
  "title": "Weather buoys",
  "type": "data",
  "style": "/plotterext/signalk-buoys/style.json",
  "interactive": true,
  "interactiveLayers": ["buoy-icons"],   // optional: only these style layers
  "titleProperty": "station"             // optional: the property that names a feature
}
```

- **`interactive`** — `true` makes the overlay's features selectable. Default
  `false`.
- **`interactiveLayers`** — the style layers whose features are selectable.
  Without it, every layer of the overlay. A halo or label layer is usually
  left out.
- **`titleProperty`** — the feature property that names it, for the host's
  header and the target's `name`. Default `name`; without one the host uses
  the overlay's `title`.

**Feature ids.** A selectable feature needs a stable id, which becomes the
target's `featureId`: the top-level `id` of a GeoJSON feature (the same id
`overlay.setData` upserts and removes by), or for a vector source the property
its `promoteId` names, as in the MapLibre Style Spec. A feature without an id
is not selectable.

**A primary select** (a tap or a click) on a selectable feature:

- runs the extension's `default` action for that feature, if one applies — the
  first in manifest order when several do;
- otherwise, when any of the extension's actions applies to it, shows the
  host's UI for a selected feature — the reference host opens a popover,
  titled by `titleProperty` — with those actions;
- otherwise behaves as if the feature were not interactive: the select goes to
  whatever lies beneath.

When a selectable overlay feature and one of the host's own features are both
under the pointer, the host resolves them as it does any several features (see
*Where actions appear*).

A context request on the feature (a right-click or long-press) offers the same
actions, with the `position` actions of every extension.

Only the extension that owns an overlay sees its features as targets: an
`overlayFeature` target entry applies to the declaring extension's overlays
only. The host decides how a selected feature looks (if at all), and never
mistakes an overlay feature for one of its own, whatever its id.

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

### Panel state

A loaded panel is not always on screen. A `keepAlive` panel stays loaded when
the user closes it or opens another panel in its place, and a host may let the
user collapse a panel to its header. The `panels.state` capability lets an
extension follow this: a panel can pause work nobody can see (a video feed, an
embedded webapp), and a background runtime can tell whether its panels are
showing.

A panel's state:

```json
{ "panel": "sounder-view", "visible": true, "collapsed": false }
```

- **`panel`** — the panel's manifest id.
- **`visible`** — whether the host is presenting the panel in its UI: its
  drawer is showing it, its dialog is open. `false` while the panel is loaded
  but not presented.
- **`collapsed`** — whether the host shows the panel reduced to its header, its
  content out of sight. A collapsed panel stays `visible`, as a collapsed window
  does. Collapsing is an optional host feature; a host without it always
  reports `false`.
- **`targetInstance`** — present only for a configuration panel opened for a
  widget instance: the instance it configures (its `context.targetInstance`).
- **`targetOverlay`** — present only for a configuration panel opened for an
  overlay: the overlay it configures (its `context.targetOverlay`).

`visible` describes the host's presentation only. It does not change when the
browser tab is hidden (inside the iframe, `document.visibilityState` reports
that), nor when a window or other overlay covers part of the panel.

**`ui.listPanels`** returns `{ panels }`: the state of every loaded panel of
the caller's extension. A panel that is not loaded is not listed. Windows are
not listed either: a panel shown in a window is a `window` context, whose state
`ui.listWindows` and `window.state` report (see *Windows*). An `embedding-host`
context has no manifest, so its list is always empty.

**`panel.state`** (see *Host events*) carries the same state and is emitted
whenever a loaded panel of the extension becomes visible or hidden, or
collapses or expands. It is delivered to the extension's contexts that
subscribed, the panel itself included, and never to another extension. Like
`nightMode.changed` it is **origin-transparent**: the user closing the drawer
or switching panels, and any extension's `ui.openPanel`, `ui.togglePanel` or
`ui.closePanel`, all produce it.

- **Opening** a panel loads it if needed and reports `visible: true`. A panel
  that has just loaded cannot have subscribed yet, so it reads its own state:
  subscribe to `panel.state` first, then call `ui.listPanels` and find its
  entry by `context.id` (and `context.targetInstance` for a configuration
  panel).
- **Closing** a panel that unloads when hidden (`lifecycle: "onOpen"`) still
  reports `visible: false` to the extension's other contexts; the panel itself
  is already unloading.
- Events describe transitions only: a host sends no `panel.state` for a panel
  whose state did not change.

**Errors** use the standard `error.data.reason` convention:
`panels.notSupported` (host lacks `panels.state`).

### Windows

A **window** shows one of an extension's iframe panels floating over the chart,
instead of in the host's panel drawer: a sonar trace beside the chart, a camera
feed in a corner, a confirmation over everything. The capability is `windows`.

A window is opened by the extension's code with `ui.openWindow`, or by one of
its toolbar buttons with an `openWindow` / `toggleWindow` action (see
*Buttons*). Unlike a drawer panel, a window can be open **several times at
once** (each window is its own context, with its own
parameters), and is **positioned and sized** by the extension, the user, or
both. The host still owns the window: its frame, its title bar, its close
control and where it may go. What the extension sends is a request; what the
host reports back is the truth.

#### Opening a window

**`ui.openWindow`** opens one of the caller's own iframe panels (a `panels`
entry in its manifest) in a new window and returns its state:

```json
{
  "panel": "sounder",
  "params": { "app": "/signalk-wifish/" },
  "title": "Echo sounder",
  "geometry": {
    "anchor": "bottom-right",
    "offset": { "x": 16, "y": 16 },
    "width": 480,
    "height": 240
  },
  "restoreKey": "sounder"
}
```

| Field        | Default              | Meaning |
| ------------ | -------------------- | ------- |
| `panel`      | (required)           | Id of an iframe panel in the caller's manifest. A window shows only the extension's own panels, never an arbitrary URL. To show another page, the panel embeds it. |
| `params`     | `{}`                 | A plain JSON object handed to the window in its handshake (`context.params`), so one panel can serve many windows. |
| `title`      | the panel's `title`  | Text for the title bar. |
| `geometry`   | host's choice        | Requested size and position (see *Geometry*). |
| `modal`      | `false`              | A modal window blocks the chart and every other window until it closes (see *Modal windows*). |
| `resizable`  | `true`               | Whether the **user** may resize the window. |
| `movable`    | `true`               | Whether the **user** may move the window. |
| `titleBar`   | `"fixed"`            | `"fixed"` or `"autoHide"`: the title bar hides when idle and the host keeps a visible way to bring it back. |
| `userClose`  | `"close"`            | What the user's close control does: `"close"` closes the window, `"hide"` hides it (see *Hidden windows*). The host decides how the control looks in each mode. |
| `visible`    | `true`               | `false` opens the window hidden: loaded and running, not shown. |
| `single`     | `false`              | If a window of this panel is already open for the extension, return that window (shown and raised) instead of opening another. `params` and `geometry` of the call are then ignored. |
| `restoreKey` | none                 | Remember this window's geometry under this key, per extension (see *Remembered geometry*). |

`resizable` and `movable` limit the **user** only. The extension can always
move and resize its own windows with `ui.updateWindow`.

#### Geometry

```json
{
  "anchor": "top-right",
  "offset": { "x": 16, "y": 64 },
  "width": "40%",
  "height": 300,
  "minWidth": 240,
  "minHeight": 160,
  "maxWidth": 800,
  "maxHeight": "80%"
}
```

- **Window area.** All geometry is relative to the **window area**: the part of
  the host's screen it makes available to windows. The host defines it, it may
  exclude the host's own controls and docked panels, and it may change at any
  time (a drawer opens, the device rotates).
- **Sizes** (`width`, `height`, and the `min*`/`max*` limits) are either a
  number of CSS pixels or a percentage string of the window area (`"40%"`).
  Pixels suit content with a natural size; percentages suit "a third of the
  screen".
- **Position** is an `anchor` plus an `offset`. The anchors are `top-left`,
  `top-center`, `top-right`, `center-left`, `center`, `center-right`,
  `bottom-left`, `bottom-center` and `bottom-right`. `offset` (pixels or
  percentages, default `0`) is measured **inward** from the anchored edges; on a
  centered axis a positive offset moves right or down. An absolute position is
  `top-left` with an offset. Anchoring keeps a window where it belongs when the
  window area changes size: a `bottom-right` window stays in the bottom-right.
- **The host clamps.** It keeps every window inside the window area and within
  its own minimum usable size, and may ignore a request it cannot honor. The
  window's **actual** position and size are always in its state (`bounds`).
- **Beyond the window area.** A host whose window area leaves out some of its
  own controls may still let a window reach over them: when the user moves or
  resizes it there, or, on a small screen, when the window's `minWidth` /
  `minHeight` would not otherwise fit. Requested geometry is still resolved
  against the window area, so a window only covers host controls when the
  user or its minimum size puts it there. Set `minWidth` to the narrowest
  width your content works at rather than relying on this. A window never
  covers the host's safety UI (alarms, alerts, man-overboard).

#### Window state

`ui.openWindow`, `ui.updateWindow`, `ui.listWindows` and the `window.state`
event all describe a window the same way:

```json
{
  "windowId": "w-7f3a",
  "panel": "sounder",
  "title": "Echo sounder",
  "presentation": "floating",
  "bounds": { "x": 1424, "y": 776, "width": 480, "height": 240 },
  "area": { "width": 1920, "height": 1032 },
  "visible": true,
  "collapsed": false,
  "poppedOut": false,
  "modal": false
}
```

- `bounds` — the actual position and size, in CSS pixels from the top-left of
  the window area; `area` is the window area's current size. A window that
  reaches beyond the window area (see *Geometry*) has `bounds` partly outside
  `area`: `x` or `y` below `0`, or `x + width` / `y + height` past it.
- `presentation` — how the host is showing the window: `floating` (a free
  window), `sheet` (docked full-width along an edge) or `fullscreen`. A host may
  choose `sheet` or `fullscreen` whenever a floating window would not fit, for
  example on a phone, and switch back when it does. `resizable`, `movable` and
  `geometry` apply to `floating` windows; in the other presentations the host
  ignores them, and `bounds` still reports what is on screen.
- `collapsed`, `poppedOut` — optional host features (see *Host window
  features*); always `false` on a host without them.

#### Managing windows

Windows belong to the **extension**, not to the context that opened them: any
of the extension's contexts may update, focus, list and close them, and they
outlive the context that opened them (a panel can open a window and close
itself). Another extension's windows are invisible to the caller.

- **`ui.updateWindow({ windowId, title?, geometry?, visible? })`** changes a
  window and returns its new state. `geometry` fields given replace the current
  ones; fields left out keep their current values.
- **`ui.focusWindow({ windowId })`** raises a window above the other windows. It
  is a request: a host may keep its own stacking rules, and focusing does not
  show a hidden window.
- **`ui.closeWindow({ windowId })`** closes a window; its page unloads.
- **`ui.listWindows`** returns `{ windows }`, the state of every open window of
  the caller's extension, hidden ones included.

In a `window` context, `windowId` may be left out of `updateWindow`,
`focusWindow` and `closeWindow` to mean the window itself, so a window can
close itself (the counterpart of `ui.closePanel`).

#### The window context

A window's iframe is a context of kind `window`. Its handshake carries the
panel id, the window's id and the `params` it was opened with:

```json
"context": {
  "kind": "window",
  "id": "sounder",
  "instanceId": null,
  "windowId": "w-7f3a",
  "params": { "app": "/signalk-wifish/" }
}
```

A window context may call everything a panel context may, except
`ui.closePanel`; it closes itself with `ui.closeWindow`. It has no widget
instance, so `state.*` defaults to the `extension` scope. A window's id lasts
only as long as the window: windows do not survive a reload of the host, and
the host never reopens an extension's windows by itself. An extension that
wants its windows back opens them again, typically from a background runtime
at startup, with `restoreKey` to put them where the user left them.

Every window loads its panel's page when it opens and unloads it when it
closes. The panel's `lifecycle` value does not apply to windows; a window that
should keep running while out of sight is hidden instead.

#### Hidden windows

A hidden window (`visible: false`) is out of sight but **still running**: its
page, its bus connection and its event subscriptions stay alive, so a sounder
keeps its history while hidden. Show it again with
`ui.updateWindow({ windowId, visible: true })`.

- Browsers may throttle rendering in a hidden iframe (for example
  `requestAnimationFrame`); timers and network connections keep running. Do
  not rely on drawing while hidden.
- With `userClose: "hide"`, the user's close control hides the window instead
  of closing it, so a toolbar button can bring it back as it was.
- A hidden window is the extension's to show or close again; the host offers
  no control over a window that is not on screen. An extension that hides a
  window should give the user a way back to it, such as a `toggleWindow`
  button.
- The host may close a hidden window to reclaim resources, reporting
  `window.closed` with reason `host`. Hidden windows count toward the host's
  window limit.
- Hiding a popped-out window returns it to the host first.

#### Modal windows

A modal window (`modal: true`) sits above everything the extension can put on
screen and blocks the chart and every other window until it closes. Use it for
something the user must answer now.

- Only one modal window may be open at a time.
- It cannot be hidden: `visible: false` and `userClose: "hide"` are rejected.
- With no `geometry`, it is centered.
- It never covers the host's own safety UI (alarms, alerts, man-overboard).
  Those stay above it and usable.
- The user can always dismiss it: its close control, and the Escape key where
  there is a keyboard, close it.

#### The user's control

- **The host owns the title bar.** It shows the title and a close control the
  extension cannot remove or disable, so every window on screen can be closed
  even when its extension is broken or hung.
- The user may move and resize a `floating` window (unless `movable` /
  `resizable` say otherwise), and may raise it by interacting with it.

#### Host window features

A host may add its own window features, such as collapsing a window to its
title bar (`collapsed`), changing its opacity, or popping it out into a separate
always-on-top browser window (`poppedOut`). They are the host's to offer and
only ever started by the user. A collapsed window keeps running, like a hidden
one. A host may reload a window's page when popping it in or out: the page then
handshakes again with the same `windowId` and `params`.

#### Remembered geometry

With a `restoreKey`, the host remembers the window's last geometry under that
key for the extension and uses it **instead of** the requested `geometry` the
next time the extension opens a window with the same key. The user drags the
sounder to the top-left once, and it opens there from then on. A host should
remember it per device, since a layout that suits a laptop rarely suits a
phone. An extension that needs a fresh position calls `ui.updateWindow` after
opening.

#### Events

Window events go to the contexts of the **extension that owns the window**
(including the window itself) that subscribed to them:

- `window.bounds` — `{ windowId, bounds, area }`: the window's actual geometry
  changed: the user finished a move or resize, the extension called
  `ui.updateWindow`, or the host re-clamped it after the window area changed.
  Sent once per change, not continuously during a drag.
- `window.state` — the full window state, when `visible`, `collapsed`,
  `poppedOut`, `presentation` or `title` changed.
- `window.closed` — `{ windowId, reason }`: the window closed and its page
  unloaded. `reason` is `user` (the user closed it), `extension`
  (`ui.closeWindow`) or `host` (the host closed it: to reclaim resources, or
  because the window's panel left the manifest).

When an extension leaves the collection (its plugin disabled), the host closes
all its windows; no event is sent, since none of its contexts remain.

#### Errors

Errors use the standard `error.data.reason` convention: `windows.badRequest`
(invalid params — e.g. a malformed `geometry`, an unknown `anchor`, or a modal
window asked to hide), `UNKNOWN_PANEL` (no iframe panel with that id in the
caller's manifest, as for `ui.openPanel`), `windows.unknownId` (no open window
with that id belongs to the caller), `windows.limit` (the host will not open
more windows), `windows.modalOpen` (another modal window is already open),
`windows.notSupported` (host lacks `windows`).

An `embedding-host` context has no manifest, so it cannot open windows.

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
- Windows (capability `windows`) show only an extension's own manifest
  panels, never an arbitrary URL, under the same sandbox. The host owns each
  window's frame and its close control, so any window on screen can be
  closed, and keeps its own safety UI (alarms, alerts) above any extension
  window, modal ones included.
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

- **Hovering data-overlay features.** A selectable overlay feature (see
  *Interactive overlay features*) is selected, not hovered: there is no hover
  feedback or hover event, and the host chooses how a selection looks.
- **A stream of map clicks.** Extensions are not sent every click or
  right-click on the chart. A click the host already acted on (a popover, a
  menu, a point added to a drawing) cannot be shared without ambiguity. An
  extension acts on the user's choice through *Actions*, or asks for one with
  *Picking on the map*.
- **Consulting extension code when a menu opens.** The host builds every menu
  from what it already holds: the manifest, `match` against the target, and
  the visibility the extension set beforehand with `actions.setVisibility`. It
  never asks a running extension what to offer for this particular selection,
  so a menu never waits on extension code. An action's `title` is fixed text,
  not a template; retitling actions from code could be added later without
  breaking existing manifests.
- **Manifest-declared filter chains.** Display filtering here is imperative:
  running extension code pushes an id set or `match` predicate via
  `resources.setFilter`. Filters declared _statically in the manifest_ and
  evaluated by the host on every resource fetch are out of scope for this
  version.
- **Publisher-filtered subscriptions.** `events.subscribe` matches on the
  event name only; a context cannot limit a subscription to events its own
  extension published. Dotted `<extension-id>.<name>` topics (see *Publishing
  events*) keep extensions' traffic apart. An optional subscription `scope`
  could be added later without breaking existing subscribers.
- **Host-into-runtime calls (`callRuntime`).** Background runtimes drive the
  host — they call host methods and react to host events; the host does not
  call into a runtime. The reverse call direction is out of scope for this
  version.
