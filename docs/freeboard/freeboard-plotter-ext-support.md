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
package; Freeboard depends on it (`^0.7.1`) and imports its host entry point
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
`map`, `resources`, `resources.filter`, `routes`, `background.iframe`, `ui`.

(The authoritative list is `HOST_CAPABILITIES` in
`src/app/modules/plotterext/types.ts`.)

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
