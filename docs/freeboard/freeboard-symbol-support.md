# Freeboard-SK: Custom Map Symbol Support

How Freeboard-SK consumes **custom map symbols** published by a Signal K server
and uses them in place of (or in addition to) its built-in icons.

This document is both an end-user feature guide and an implementation reference
for agents working on the symbol code. The host-agnostic resource contract it
builds on is [`../api/symbols-api.md`](../api/symbols-api.md) — read that for the
`symbols` resource type, schema, and provider API; this document covers only what
Freeboard-SK does with it.

Applies to Freeboard-SK `2.24.0-beta.1` and later (the symbol-consumer work).

---

## What it does

Freeboard-SK can display custom artwork for notes, waypoints, vessels, aids to
navigation, and route markers — a blue dive flag instead of the default marker, a
custom boat icon for your own vessel, branded buoys — without rebuilding
Freeboard. Custom symbols are discovered from the server at startup, offered in
the note and waypoint icon pickers, and rendered on the chart. GPX import/export
is symbol-aware so symbol choices survive a round trip.

There is nothing to enable: Freeboard uses custom symbols automatically when they
are available, and behaves exactly as before when they are not.

## Requirement: a symbol provider plugin

Custom symbols require a **symbol provider plugin** on the Signal K server.
Freeboard consumes whatever symbols the server publishes at
`/signalk/v2/api/resources/symbols`; it does not create or store them. With no
provider installed, only the built-in icons are used.

The reference provider is
[`signalk-symbol-manager`](https://www.npmjs.com/package/signalk-symbol-manager),
which lets you upload, edit, and organize symbols through its own web app. Any
plugin that publishes symbols in the standard way works.

## How overriding works

Each symbol has a short **id** (e.g. `dive-site`) in a **namespace** (e.g.
`user`), giving a canonical reference `<namespace>:<id>` (e.g. `user:dive-site`).
There are two override mechanisms:

1. **Per-feature `skIcon` (user-assigned).** Notes and waypoints store a
   user-chosen icon in `feature.properties.skIcon`. The value may be a bare
   built-in id (`dive-site`) or a qualified ref (`user:dive-site`). At render
   time it resolves **external-first**, so creating a symbol whose id matches a
   built-in transparently overrides it everywhere that built-in is used — no need
   to re-edit existing notes/waypoints.
2. **Well-known marker ids (global).** Some markers are chosen by the app from
   data, not picked per feature (AIS type, route-vertex role, own vessel). These
   are overridden by creating a symbol whose **id matches a reserved well-known
   id** (below). The override is global — every marker of that kind uses it.

In the pickers, a custom version of a built-in **replaces** the built-in entry
(you see one entry, not two). A **"Show all symbols"** toggle reveals everything
— every custom symbol plus the original built-ins — so you can still pick the
original. If you explicitly pick a built-in this way, Freeboard persists the
unqualified id and won't silently swap in a custom version later.

**Roles.** A symbol's optional `roles` array (`note`, `waypoint`, …) controls
only where it is *offered* in the pickers, keeping each picker tidy. Roles do
**not** affect map rendering — a symbol overrides a marker whenever its id
matches, regardless of roles. "Show all symbols" ignores the role filter.

**Rotation.** Markers that rotate to a heading/bearing keep rotating when
overridden: AIS vessels and AtoNs rotate to `orientation`, route waypoint markers
to segment bearing, own vessel to `heading`. External symbols are built with
`rotateWithView=false`; the rendering paths set `rotateWithView=true` so
overrides behave like the built-ins.

## Where custom symbols can be used

| Area | Custom symbols? |
|------|-----------------|
| Note markers | Yes |
| Waypoint markers (the **Waypoints** category) | Yes |
| Own vessel | Yes |
| AIS vessels | Yes |
| Aids to Navigation (AtoNs) | Yes |
| Route start / turn / end markers | Yes |
| Specialized waypoint types (start pin, start boat, sightings, alarms, pseudo-AtoN) | No — keep built-in icons |
| Region area shading | No |
| Moored-vessel dots | No |

## Overridable id reference

To replace a built-in, create a custom symbol with the matching id.

**Note / waypoint POI icons** (notes, and waypoint icons in the **Waypoints**
category):

```
anchorage   boatramp   bridge      business    dam
dive-site   ferry      hazard      inlet       lock
marina      dock       turning-basin           radio-call-point
transhipment-dock      notice-to-mariners      diver-down
navigation-structure   fuel        tunnel      waterway-guage
```

**Generic waypoint marker:** `waypoint` (the default for the Waypoints category).

**Own vessel:** `vessel-self` (rotates to heading; upright when position is fixed
/ no heading).

**AIS vessel icons** (by ship class/state; rotate to `orientation`):

```
ais_active   ais_highspeed   ais_special   ais_passenger   ais_cargo
ais_tanker   ais_other       ais_inactive  ais_buddy       ais_self
```

(`ais_self` is the *focused* AIS target, **not** your own boat — that is
`vessel-self`.)

**Aids to Navigation** — each is a *real* (physical) and *virtual* (AIS-only)
form, `real-…` / `virtual-…` (matching the built-in SVG basenames; rotate to
`orientation`):

```
real-north  / virtual-north         real-east   / virtual-east
real-south  / virtual-south         real-west   / virtual-west
real-port   / virtual-port          real-starboard / virtual-starboard
real-danger / virtual-danger        real-safe   / virtual-safe
real-special / virtual-special      real-basestation / virtual-basestation
real-weatherStation / virtual-weatherStation
real-aton   / virtual-aton          (generic / fallback AtoN)
```

**Route markers:** `route-start`, `route-waypoint` (cloned per segment, rotated
to bearing), `route-end`.

**Weather indicators** — flow arrows drawn programmatically and rotated to the
reported direction:

- `windIndicator-arrow` — wind-direction arrow (the "Arrow" wind indicator).
- `oceanCurrentIndicator-arrow` — ocean-current flow arrow.
- `tidalCurrentIndicator-arrow` — tidal-current flow arrow.

> **Current arrows are tinted by speed — draw the override with a white fill.**
> The ocean and tidal overlays recolour the arrow to encode current speed (ocean:
> a blue→red velocity gradient; tidal: green/yellow/red severity) by applying the
> icon's `color`, which *multiplies* the glyph's pixels. So a provider override
> should use a **white/neutral fill** to come out the intended colour (a black
> outline is preserved; a pre-coloured glyph is multiplied by the speed colour and
> will look muddy or wrong). The wind arrow is **not** tinted, so its override
> renders in its own colours.

The route, own-vessel, AIS, AtoN, and weather-indicator markers are chosen
automatically by Freeboard rather than picked per feature, so they override
**globally**: create a symbol with the matching id and every marker of that kind
uses it.

## What is NOT overridable (and why)

| Target | Reason |
|--------|--------|
| **Specialized waypoint types** (`start-pin`, `start-boat`, `whale`, `pob`, `pseudoaton`) | Only the `waypoint` type resolves overrides; these render their built-in icon, and their picker categories show built-ins only. |
| **Region polygons** (e.g. a `hazard` area) | Rendered as an OL area fill/stroke `Style`, not a point icon. Belongs to the future `mapStyles` resource provider. |
| **Moored AIS vessels** | Rendered as a small colored `Circle` dot (`AIS_MOORED_STYLE_IDS`), not an icon. |

## GPX import / export

A symbol may declare a **`gpxSym`** (GPX `<sym>`) and **`gpxType`** (GPX
`<type>`) so symbol choices survive GPX round-trips.

- **Import** (`gpxload-dialog` → `transformWaypoint`): for each imported waypoint
  with a `<sym>`, match in order: (1) a symbol whose `gpxSym` equals the file's
  `<sym>`, else (2) a symbol whose local **id** equals the `<sym>`. On a match,
  the waypoint is stored as `type: "waypoint"` with `skIcon` set to the symbol's
  canonical `namespace:id`. No match → default waypoint marker. Matching is exact
  and case-sensitive, and uses only `<sym>` (not `<type>`).
- **Export** (`sk2gpx` → `packageWaypoint`): a `type: "waypoint"` waypoint whose
  `skIcon` resolves to an external symbol writes that symbol's `gpxType` → `<type>`
  and `gpxSym` → `<sym>` (each only when present). Built-in icons, `default:` pins,
  and non-`waypoint` types export as before.

## Implementation notes (for agents)

When `SymbolService` loads, each symbol is registered twice:

1. With **Angular Material** under `namespace:id` (for selectors and `<mat-icon>`).
2. With **`MapImageRegistry`** as a map-marker definition under **both**
   `namespace:id` and the bare `id` (the bare id is an alias; the first namespace
   registered for a given bare id wins). The registry uses the symbol's `scale`
   and `anchor` when present; absent, placement/size are best-effort renderer
   defaults.

Consumption rules Freeboard follows (per the symbol resource contract):

- Fetch `/signalk/v2/api/resources/symbols` at startup / resource init.
- Resolve `feature.properties.skIcon` external-first; support `default:id` to
  force a built-in. **Persist the unqualified id** when the user picks a built-in
  from a picker (so a future provider can override that name); persist the
  canonical `namespace:id` when the user picks an external symbol (so the choice
  is stable even if another provider later defines the same local id); persist
  `default:id` only when the user explicitly requests the default namespace.
- Filter pickers by `roles` by default; offer a "Show all" control that ignores
  the filter. Continue supporting all built-in icon names for backward compat.
  Use a deterministic fallback icon when resolution fails; ignore symbols that
  cannot be rendered.

Key render/resolution paths: `getSymbol()` (note map marker), `getWaypoint()`
(waypoint map marker — only the `waypoint` type resolves overrides),
`resolveDisplayIcon()` (dialog/selector), and the shared `setRotation()` helper.

## Behavior without a provider

If no provider is installed (or it publishes no symbols): all pickers and the
chart use the built-in icons unchanged; "Show all symbols" shows the built-ins;
GPX import falls back to default markers; GPX export writes whatever the waypoint
already carried.

## See also

- [`../api/symbols-api.md`](../api/symbols-api.md) — the host-agnostic `symbols`
  resource type, schema, and provider API.
- [`signalk-symbol-manager`](https://www.npmjs.com/package/signalk-symbol-manager)
  — the reference symbol provider plugin.
