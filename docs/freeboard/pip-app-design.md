# PiP App for Freeboard-SK — design and plan

Status: **being built** in steps on the `pip-app` branch, one reviewed PR into `master`
per phase in §8.

## 1. The ask

Show another Signal K webapp (first case: the [signalk-wifish](https://github.com/KEGustafsson/signalk-wifish)
echo sounder at `/signalk-wifish/`) in a small window **on top of the chart**, that the
user can **move anywhere, resize freely, and keep running** while navigating. Content
may be any installed Signal K webapp or any http(s) page. Built for one person's helm
first, but with no limitation that would stop it going upstream to
`SignalK/freeboard-sk` later.

## 2. What Freeboard already has (and why none of it is enough)

| Existing thing | Where | What it gives us | Why it does not cover the ask |
|---|---|---|---|
| **Instrument panel** | `app.component.html` L353-425, `app.component.ts` `formatInstrumentsUrl()` / `selectPlugin()` | Proves same-origin webapps embed fine in an iframe with `sandbox="allow-scripts allow-same-origin allow-forms"`; builds URLs from `app.hostDef.url`; a settings UI to pick a webapp from `signalk.apps.list()`; favourites rotation; `startOnOpen` ("halt on hide") lifecycle | Fixed 345 px drawer, one app at a time, docked right, hidden below 800 px wide, disabled when Freeboard is itself embedded |
| **Video "PiP"** | `src/app/lib/components/pip.component.ts` (`pip-video`) | Precedent for an OS-level always-on-top window | `<video>` only (`requestPictureInPicture`). It keeps its own component and `resources.video` config; PiP App shares neither (see §3) |
| **Plotter Extension panels / widgets** | `src/app/modules/plotterext/` | Iframe hosting, `keepAlive` lifecycle, the `ui.openPanel` host API, `postMessage` bus | Panels dock in a drawer that *pushes the map*; widgets live in fixed anchor grids; `resolveAssetUrl()` rejects anything not same-origin with the SK server; neither is movable or resizable |
| **Draggable palettes** | `chart-time-dialog.ts`, `image-adjustment-dialog.ts`, `track-history-dialog.ts` (`cdkDrag` on a modeless `MatDialog`), persisted `*PalettePos` in config, clamped on restore by `onScreenPalettePosition()` | The pattern for *remembering a position* and clamping it back on screen | Move only, no resize, MatDialog chrome, one at a time |
| **Draggable consoles** | `alert-list`, `build-route`, `autopilot` (`cdkDrag` + `cdkDragHandle`) | Same | Same |

There is **no resizable element anywhere in the app**, and no generic "window" host.
That is the gap.

## 3. Naming

User-facing name: **PiP App** (picture-in-picture app). The toolbar button, menu and
dialogs use it. The existing video picture-in-picture button (`pip-video`, tooltip
"Show Video", configured as `resources.video`) keeps its own wording and code; the
two never share a component, config key or CSS class.

Internal names use the `pip-app` prefix:

- module `src/app/modules/pip-app/`
- selectors `fb-pip-app-host`, `fb-pip-app`, `fb-pip-app-menu`
- config key `config.pipApps`
- CSS class `.fb-pip-app` (this exact class is also the pointer-event exclusion
  hook, see §6.4)

## 4. Design in one paragraph

A single **`PipAppService`** (signal store) owns a list of window definitions.
A single **`fb-pip-app-host`** element, placed as a `position: fixed` sibling at
the `.view` level with `pointer-events: none`, renders one **`fb-pip-app`** per
definition. Each window is a title bar (drag handle + buttons) over a sandboxed
`<iframe>`, with eight resize handles. Move/resize are hand-rolled Pointer Events
with pointer capture, and every iframe on the page stops taking pointer events
while a gesture is live. Geometry is stored as **viewport fractions** in `config.pipApps`, so the
same layout re-applies on a laptop and a tablet (config already syncs to the server's
applicationData). Windows are **never re-parented** (an iframe reload would lose the
echogram history), only transformed, so collapse/expand/z-order are all CSS. On top
of that in-app tier, a **"Pop out"** button moves a window into an **OS-level
always-on-top window** via the browser Document Picture-in-Picture API (Chrome, Edge,
current Firefox) with a `window.open(...,'popup')` fallback (Safari), so the sounder
stays visible even when the helm tablet switches to another app. Later, the same
model is exposed to Plotter Extensions as `ui.openWindow`, so a plugin such as
wifish can offer its own "show in Freeboard" button.

### What is novel here

1. **Two tiers from one model.** The same window definition renders in-app (any
   browser, kiosk mode, touch) or as a true OS always-on-top window (Document PiP).
   No chart plotter in the SK ecosystem does the second.
2. **Device-independent layouts.** Fractions of the viewport + minimum pixel sizes +
   clamp-on-restore, synced through applicationData. Open Freeboard on the phone and
   the sounder is in the same corner at a sane size.
3. **"Open as PiP App" from the instrument panel.** One button in the existing instrument
   panel header turns the docked app into a PiP App window. Zero new concepts for
   existing users.
4. **Plugins can open their own window** (`ui.openWindow` with a preferred pixel
   size). wifish can ask for a 480×240 window over the chart.
5. **Source kinds are open-ended.** `webapp` (server-relative path), `url` (any
   http(s)), and room for `component` later (a second map, the autopilot console,
   an instrument dial) without touching the window chrome.

## 5. Data model

```ts
// src/app/modules/pip-app/types.ts
export type PipAppSource =
  | { kind: 'webapp'; path: string }   // '/signalk-wifish/' — resolved against app.hostDef.url
  | { kind: 'url'; url: string };      // absolute http(s) URL, validated at the boundary

/** Position and size as fractions of the viewport (0..1). */
export interface PipRect { x: number; y: number; w: number; h: number }

export interface PipAppDef {
  id: string;                 // uuid
  title: string;
  source: PipAppSource;
  rect: PipRect;
  collapsed: boolean;         // title bar only; iframe stays mounted (hidden)
  opacity: number;            // 0.3 .. 1, default 1
  barPinned?: boolean;        // keep the title bar shown; absent = auto-hide (§6.2)
  popout?: 'popup';           // out in a noopener popup until the user brings it back (§6.6)
}

// persisted:  config.pipApps: { windows: PipAppDef[] }  (every open window reopens on load)
// runtime only (service signals, not persisted): zOrder: string[], gestureActive,
// the window shown in the Document PiP window
```

Why fractions: `imageAdjustPalettePos` and friends store pixels and need clamping
every restore; pixels also make a tablet layout useless on a laptop. Fractions +
`MIN_W = 160px`, `MIN_H = 120px`, and "title bar must stay inside the viewport"
clamping on every `resize` event cover both.

Persistence follows the existing contract exactly: add the key to `IAppConfig`
(`src/app/types/index.d.ts`), to `defaultConfig()` and to the **`cleanConfig()`
migration** in `src/app/app.config.ts` (there is no deep merge; without the
migration step an existing stored config simply lacks the key). Save through
`app.saveConfigDebounced()` on drag/resize end, `app.saveConfig()` on add/remove.

Boundary validation (and the only place it happens): the "Custom URL" dialog and
`cleanConfig()` both reject anything whose parsed `protocol` is not `http:`/`https:`.
`webapp` paths must start with `/`.

## 6. Architecture and the decisions that matter

### 6.1 Placement in the shell

```
div.view                               (position:fixed; inset:0; flex row)
  mat-sidenav-container.pe-view-main   (map, toolbars, widgets…)
  fb-plotterext-panel-drawer
  fb-plotterext-runtimes
  fb-pip-app-host   ← NEW: position:fixed; inset:0; pointer-events:none; z-index:4850
```

- **Sibling of the sidenav container, not inside it.** Inside `mat-sidenav-content`
  a window would shift when the right drawer or the extension panel drawer opens,
  and the lessons log records `mat-sidenav-container` scrolling the whole app
  sideways under edge drags. A fixed sibling has neither problem.
- **z-index 4850** (no central constants exist; this is the current band map):
  above the map, widgets (2000), popovers (3990), toolbars and status bar (4800);
  below nav-data/alarm/playback panels (4900-4902), the left menu and FAB (5000),
  route builder (6001), autopilot console (6010), alert list (6100), and all CDK
  overlays (dialogs, menus, tooltips). Rationale: a PiP App window is "chart
  content", not chrome; chrome and dialogs must stay reachable. Revisit only if a
  real user asks for windows over the left menu.
- The host itself never intercepts pointer events; each `.fb-pip-app` sets
  `pointer-events: auto`.

### 6.2 Window component

```
.fb-pip-app  (position:absolute; transform:translate(x,y); width/height px; box-shadow; border-radius)
  .fb-pip-app__grip     shown while the bar is hidden: hover/tap reveals the bar, drag moves the window
  .fb-pip-app__bar      title · [collapse] [more: open in tab, pop out, auto-hide, opacity] [close]   ← drag handle
  .fb-pip-app__body
     iframe[src][sandbox="allow-scripts allow-same-origin allow-forms"][allow="fullscreen"]
  .fb-pip-app__handle × 8 (n, s, e, w, ne, nw, se, sw; 10px hit area, 16px on coarse pointers)
```

- Rendered by `@for (w of service.windows(); track w.id)`; the iframe `src` is a
  `computed` per window that only changes when the *source* changes, so moving,
  resizing, collapsing, re-ordering or editing the title never reloads it.
- **Collapse = shade.** The window shrinks to its title bar in place; the body gets
  `visibility: hidden` (not `display: none`, so layout-dependent code inside the
  embedded app keeps a real size and its timers/SSE stream keep running). Double-tap on the title toggles it. No separate
  dock strip: the bottom edge is already contested by widget anchors, the FAB and
  the nav-data panel.
- **Auto-hiding title bar.** Unless the window is pinned ("Auto-hide title bar" in
  the More menu, persisted as `barPinned`), the bar floats over the top of the
  iframe and fades out after **3 s** idle, so the app gets the whole window. The
  iframe keeps the full window height whether the bar is shown or not, so hiding
  and showing never reflows the embedded app (an echogram would otherwise redraw).
  A small grip pill at the top centre brings it back: mouse hover over the grip or
  the top edge, a tap, or Enter when focused. The grip also drags the window
  directly. The bar stays while the mouse is over it, a gesture runs, its menu is
  open or keyboard focus is in it, and hides **1 s** after the mouse leaves. A
  collapsed or popped-out window always shows its bar. Hover can't be the only
  trigger: the parent page gets no pointer events from inside the iframe, so
  touch users and anyone working in the app would otherwise have no way back.
  The 3 s matches the idle time of video-player controls and full-screen system
  bars: long enough to read the title and reach a button.
- Click/pointerdown anywhere on a window brings it to the front (`zOrder` update)
  and sets `activeId`; the active bar gets the primary colour.
- Chrome colours come from `--mat-sys-*` tokens like the rest of the app. Lesson log
  warning applies: component surfaces styled from those tokens can go light in dark
  mode; test the title bar in dark theme.
- `.app-night` is a CSS filter on the whole tree, so night mode dims the embedded
  app too. Desired.

### 6.3 Move and resize: hand-rolled Pointer Events, not `cdkDrag`

The palettes use `cdkDrag`, and it is tempting to reuse. Decision: **do not**, because
resize from the north/west edges must change *both* the translate and the size in
one gesture, and `cdkDrag` owns the element transform; fighting it means feeding a new
`cdkDragFreeDragPosition` object on every pointer move. A single gesture controller is
~120 lines and gives one code path for move and all eight resize modes:

```ts
// src/app/modules/pip-app/geometry.ts  (pure, unit-tested without DOM)
export type GestureMode = 'move'|'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw';
export function applyGesture(start: PxRect, mode: GestureMode, dx: number, dy: number,
                             viewport: {w:number;h:number}, limits: {minW;minH;barH}): PxRect
export function clampToViewport(r: PxRect, viewport, barH): PxRect
export function toFractions(r: PxRect, viewport): PipRect / fromFractions(...)
export function snapToEdges(r: PxRect, viewport, threshold = 12): PxRect
```

Gesture mechanics (`pip-app-window.component.ts`):

1. `pointerdown` on bar/handle → `setPointerCapture`, record start rect and mode, set
   `service.gestureActive = true`.
2. `pointermove` → compute via `applyGesture`, write to a local `rect` signal, batched
   per `requestAnimationFrame`. Run the listeners outside the Angular zone as the
   widget overlay does; signals re-enter where needed.
3. `pointerup`/`pointercancel` → release capture, persist fractions, debounced save,
   `gestureActive = false`.

**The iframe trap.** Iframes swallow pointer events. Pointer capture keeps *our*
moves flowing even over our own iframe, but a fast drag across *another* window's
iframe, a placed widget, the instrument drawer or the extension panel still loses
events in some browsers. Hence, while `gestureActive`, the host puts a class on
`<body>` that sets `pointer-events: none` on every iframe on the page (windows,
widgets, drawers). Cheap, and it also stops the embedded app from reacting to a
drag that crosses it.

Touch: `touch-action: none` on bar and handles only (the iframe keeps its own
gestures, wifish needs pinch-zoom). Handles grow to 16 px under
`@media (pointer: coarse)`.

### 6.4 Coexisting with what is already on the map

- **Widget overlay press-and-hold.** `widget-overlay.component.ts` installs
  document-level *capture* `pointerdown/move/up` listeners; a 1.5 s press that is not
  on one of `'.cdk-overlay-container, mat-dialog-container, button, mat-toolbar,
  .pe-cell, .pe-chips'` opens the Add Widget picker. **Add `.fb-pip-app` to that
  selector**, otherwise holding a title bar over an anchor cell opens the picker.
  Covered by a spec.
- **OpenLayers** listens only on its own viewport element, so events on the window
  never reach the map. A pan that *started* on the map should keep going when the
  pointer crosses a window (OL tracks an active drag at document level); confirm in
  the spike, it is the behaviour we want.
- **Keyboard focus.** The embedded app takes focus when clicked; the map's key
  handlers are on the `ol-map` element. The app already calls `focusMap()` after
  every chrome action and clicking the map re-focuses it. Window close/collapse call
  `focusMap()` too. Nothing else needed.
- **Kiosk mode** hides the toolbars (and hence the launcher) but not the host, so
  the windows that were open still reopen: this is how a fixed "chart + sounder" helm
  layout is set up (arrange once without `?kiosk`, then launch with it).
- **Embedded mode** (`!app.isTopWindow()`, e.g. inside KIP): the instrument panel is
  disabled there to avoid app-in-app nesting. PiP App stay enabled: they are
  user-initiated and the only nesting risk is the user choosing it. Pop-out is
  hidden when not top window (Document PiP requires it).
- **Map resize**: not needed, windows are overlays, the map does not reflow.

### 6.5 Launchers

1. **Right toolbar button** (`mat-mini-fab`, icon `picture_in_picture_alt`, next to
   the Instruments button) → `mat-menu`:
   - installed webapps (from a cached `signalk.apps.list()`, same mapping as
     `SettingsFacade.getApps()`; factor that mapping into a shared helper rather than
     copying it);
   - "Custom address…" → small dialog: address and optional title;
   - divider; currently open windows (click = bring to front, collapsed ones expand);
   - "Close all".
2. **Instrument panel header: "Open as PiP App"** button → opens the current `instUrl()` as a
   window (same size as the drawer), closes the drawer.
3. Later (§8, phase 4): Plotter Extensions `ui.openWindow`.
4. Optional: `?pipapp=/signalk-wifish/` URL parameter for scripted kiosk launches.

### 6.6 Pop-out tier (Document Picture-in-Picture)

```ts
// pip-app-popout.service.ts
async popOut(def: PipAppDef) {
  if ('documentPictureInPicture' in window) {
    const pip = await documentPictureInPicture.requestWindow({ width, height });   // user gesture required
    pip.document.body.style.margin = '0';
    const f = pip.document.createElement('iframe');  // new iframe: the in-app one cannot be moved without a reload
    f.src = url; f.setAttribute('sandbox', SANDBOX); f.style.cssText = 'border:0;width:100%;height:100%';
    pip.document.body.append(f);
    pip.addEventListener('pagehide', () => this.popIn(def.id));   // user closed the PiP window
    this.service.markPoppedOut(def.id);   // hides + unmounts the in-app iframe (no double SSE session)
  } else {
    // Safari and older browsers. `noopener` severs window.opener, so the page
    // cannot navigate the Freeboard tab; it also makes window.open return
    // null, so the popup cannot be watched for closing (see below).
    window.open(url, `fsk-pip-${def.id}`, `popup=yes,noopener,width=${w},height=${h}`);
    this.service.markPoppedOut(def.id);   // same unmount as above: one session only
  }
}
```

Both branches unmount the in-app iframe while the app is out, so an app streaming
over SSE or a WebSocket never runs twice. The window keeps its place on the chart
as a title bar with a note and a **Bring back** button; popping in remounts the
iframe. Where the two branches differ is what the host can know:

- **Document PiP** is observable. It pops in by itself on `pagehide`, and since a
  tab has only one such window, popping out another window pops this one in
  first. Its state is runtime-only: the PiP window closes with the page anyway.
- **The `noopener` popup** is not observable. Its **Bring back** button is the
  user's confirmation that the popup is closed, and the note says to close it
  first. Until then the in-app iframe stays unmounted: closing the popup alone
  changes nothing, popping out another window leaves it out (popups do not
  replace each other), and the mark is persisted with the window
  (`popout: 'popup'`), so a reload keeps the note instead of starting a second
  copy.

Closing the PiP App window closes its Document PiP window too. A `noopener` popup
is out of Freeboard's reach: closing the PiP App window removes the window (so
nothing can bring a second copy back in) but leaves the popup running, and a
message tells the user to close it there.

Facts that shape it (checked Oct 2026): supported in Chrome/Edge 130+ and current
Firefox (shipped in 151), not Safari; **one Document PiP window per tab** (a second request closes the
first, so the UI offers "Pop out" on one window at a time and labels it); it closes
when the opener tab navigates away; it must be invoked from a user gesture; the PiP
document is same-origin with Freeboard so we can build any DOM in it. The
reload-on-pop-out is accepted and stated in the tooltip ("reloads the app"). Night
mode: copy the `.app-night` filter rule into the PiP document when
`stream.selfNightMode()` is on (small `effect`).

### 6.7 Security and content limits (state them in the UI, do not fight them)

- Sandbox is **exactly** `allow-scripts allow-same-origin allow-forms` (the existing
  app spec pins this for the instrument iframe; add the same assertion for windows).
  No `allow-top-navigation`, `allow-popups`, `allow-modals`, matching the extension
  spec's Security section. `allow="fullscreen"` is fine.
- **Why `allow-same-origin` stays, for every source.** It only matters for pages on
  Freeboard's own origin, and those are served by the user's Signal K server
  itself: the server or a webapp or plugin installed on it, code that already runs
  with the server's trust. The instrument panel and the plotter extension iframes
  grant the same flag for the same reason. Those apps need it: without it the
  frame gets an opaque origin and its own REST and SSE calls to the server lose the
  session, which breaks the motivating case (signalk-wifish). For a page on another
  origin the flag only lets it keep that origin; it gains no access to Freeboard.
  As the Plotter Extensions API's Security section puts it, the sandbox is fault
  containment, not a security boundary.
- Anything opened outside the iframe sandbox severs its opener: the "Open in new
  tab" link uses `rel="noopener noreferrer"` and the popup fallback passes
  `noopener`, so an untrusted page cannot navigate the Freeboard tab through
  `window.opener`, whatever opener policy the server sends.
- No token is appended to URLs. Same-origin webapps share the session cookie, which
  is how wifish's read-only login works today in the instrument panel.
- **Cross-origin pages can refuse framing** (`X-Frame-Options`,
  `frame-ancestors`) and the browser gives the parent no signal. Mitigation: the
  custom-URL dialog shows a one-line note, and the window bar always has
  "Open in new tab" and "Pop out" (a `window.open` popup is not subject to framing
  rules). A helper-plugin `HEAD` pre-check is possible (§8, optional) but is not
  worth its SSRF surface for v1.
- **Mixed content:** Freeboard on https cannot frame an http page. Detect
  `location.protocol === 'https:' && url.protocol === 'http:'` in the dialog and say
  so.
- Memory: every window is a full webapp. Soft cap of 6 windows with a snackbar, and
  collapse keeps the app running by design (wifish history). Document this.

## 7. File plan

```
src/app/modules/pip-app/
  index.ts
  types.ts                         PipAppDef, PipAppSource, PipRect, PIP_APP_SANDBOX
  geometry.ts  (+ .spec.ts)        applyGesture, clampToViewport, to/fromFractions, snapToEdges
  sources.ts   (+ .spec.ts)        source validation, URL resolution, default titles
  defs.ts                          normalise stored windows (used by cleanConfig)
  pip-app.service.ts (+spec) windows/zOrder/active/gestureActive signals; open/close/
                                   focus/collapse/update; persistence; webapp list cache; url resolve
  pip-app-host.component.ts   <fb-pip-app-host> fixed layer, @for windows
  pip-app-window.component.ts (+spec) chrome, iframe, gesture controller
  pip-app-menu.component.ts   <fb-pip-app-menu> launcher mat-menu (webapps, custom, open list)
  custom-url-dialog.ts             address + title, protocol / mixed-content validation
  pip-app-popout.service.ts (+spec, API stubbed)  Document PiP + window.open fallback

src/app/types/index.d.ts           IAppConfig.pipApps
src/app/app.config.ts              defaultConfig() + cleanConfig() migration (+ app.config.spec.ts case)
src/app/app.component.html         host element in .view; toolbar button + menu; "Open as PiP App" in instrument header
src/app/app.component.ts           openInstrumentsAsPipApp(); imports
src/app/lib/webapps.ts (+spec)     installed-webapps mapping shared with the settings dialog
src/app/modules/plotterext/widget-overlay.component.ts   add .fb-pip-app to the ignore selector (+spec)
src/app/modules/settings/settings.facade.ts              extract webapp-list mapping to a shared helper
```

Estimated size: ~900 lines of code and ~400 of specs for phases 1-2.

## 8. Phased plan

Each phase is one PR-sized, independently shippable step. Phase 0 is a throwaway
spike; everything after it is production code following `AGENTS.md`
(`npm run format` → `build:all` → `test:ci` before every push, `type(scope):` titles,
no `features/` edits, no version bumps).

| # | Scope | Done when | Effort |
|---|---|---|---|
| **0 Spike** | One hard-coded wifish window, move + resize over other iframes, no persistence, no menu | Dragging/resizing works on the helm device (touch) and on a desktop browser over the live map, with a placed widget and the instrument drawer open; collapse does not reload the echogram | ½-1 day |
| **1 Core** (`feat(ui): PiP App windows for embedding webapps over the chart`) | §5 model, service, host, window component, geometry + specs, config migration, toolbar launcher with installed-webapp list and custom URL, widget-overlay exclusion, soft cap, dark/night check. **Gated behind `config.experiments`** for the first upstream round | Specs green; a layout survives reload and a viewport change; two windows plus a widget plus the instrument panel coexist | 2-3 days |
| **2 Polish** (same PR or `feat(ui): …` follow-up) | Collapse, opacity, edge snapping, "Open as PiP App" from instrument panel | Manual matrix in §9 passes | 1-2 days |
| **3 Pop-out** (`feat(ui): pop a PiP App window out to an always-on-top browser window`) | §6.6, feature-detected, one-at-a-time, night mode copy, popup fallback | Works in Chrome/Edge/Firefox; falls back cleanly on Safari/iPad | 1 day |
| **4 Extension API** (`feat(plotterext): ui.openWindow host method`) | Vendor capability `x-freeboard-sk.windows` in `HOST_CAPABILITIES` while experimental, `ui.openWindow {panel or url, title?, width?, height?}` / `ui.closeWindow`, spread into the widget, panel and background method maps, documented in the host support doc, **matching tool in `dev-tools/fsk-mcp/src/tools.js`**, specs for the handlers and for the service wiring. Same-origin only (inherits `resolveAssetUrl`), so extensions can open their own panels and other pages on the Signal K server, never another origin | wifish ships a `plotterExtensions` manifest with a toolbar button that opens itself in a window at its preferred size | 1-2 days |
| **5 Optional** | `?pipapp=` launch param; helper `HEAD` embed pre-check; `component` source kind (second map view, autopilot console) | Only if asked | — |
| **6 Graduate** | Remove the experiments gate upstream after feedback; `docs(lessons):` PR with the traps found (iframe pointer capture, Document PiP one-per-tab, no re-parenting) | Maintainer decision | — |

For the owner's own use, phases 1-3 on this fork are the target; phase 4 is what
makes it compelling upstream (a plugin-driven, declared-size window rather than a
generic iframe box) and should be opened as its own PR after phase 1 merges.

## 9. Testing

Unit (`*.spec.ts`, run with `npm run test:ci -- --include "<spec>"`):

- `geometry.spec.ts`: every gesture mode, min size, snapping, clamping keeps the
  bar on screen, fraction round-trip across two viewports, snapping thresholds.
- `pip-app.service.spec.ts` (TestBed with an `AppFacade` stub, as
  `groups.service.spec.ts` does): open/close/focus/z-order, persistence writes
  `config.pipApps` and calls `saveConfig`, URL resolution for `webapp` vs `url`,
  rejection of non-http(s) sources, soft cap.
- `pip-app-window.component.spec.ts`: iframe `sandbox` is exactly the three tokens;
  the iframe element identity is unchanged after a rect/title/collapse change
  (regression guard for "never reload"); pointer-drag using the
  `chart-time-bar.spec.ts` pattern (stub `getBoundingClientRect` and pointer capture,
  dispatch events with `pointerId`); `gestureActive` is set for the gesture only.
- `app.config.spec.ts`: `cleanConfig()` adds `pipApps` to a legacy config.
- `widget-overlay` spec: a press on `.fb-pip-app` never starts the add-widget
  timer.
- `pip-app-popout.service.spec.ts`: stub `documentPictureInPicture` on `window`;
  falls back to `window.open` when absent; `pagehide` triggers pop-in.

Manual matrix before the upstream PR (screenshots for the PR body):

| Device / browser | Checks |
|---|---|
| Desktop Chrome + Firefox | drag across a widget and the drawer, resize from all 8 handles, pop-out, dark + night |
| iPad Safari (the common helm tablet) | touch drag/resize with 16 px handles, pinch inside wifish still zooms the echogram, popup fallback |
| Android Chrome phone (< 800 px) | toolbar launcher, fraction layout sanity, window never off-screen |
| `?kiosk` | open windows reappear, no launcher |
| Raspberry Pi 4 display | two windows (wifish + KIP) stay fluid |

## 10. Risks and open questions

- **Framing refusals and mixed content** are browser policy; the design surfaces
  them and offers pop-out/new-tab, it cannot remove them.
- **Document PiP on iPad**: not available, and iPadOS popups open as tabs. The
  in-app tier is the real product on tablets; pop-out is a desktop/Android bonus.
- **Performance on small ARM boards** with several full webapps: soft cap +
  documentation; consider an opt-in "unload when collapsed" later if users hit it.
- **Upstream appetite**: maintainers may prefer windows to live under the extension
  panel model rather than a new module. Keeping phase 1 behind the experiments flag
  and designing phase 4 as a thin bridge over the same service keeps both doors open.
- **Should the instrument panel itself become a docked window** (one model, two
  modes)? Attractive, out of scope: it changes a shipped feature's behaviour and
  belongs in its own discussion after phase 1 lands.
