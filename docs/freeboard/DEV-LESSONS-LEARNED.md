# Dev lessons learned

Non-obvious, repo-specific traps that cost real time (and, for AI agents, real
tokens) to discover the hard way — captured so the next person pays the cost once,
here. This is the durable companion to [`AGENTS.md`](../../AGENTS.md): that file
points you here at each phase of work; this file holds the detail.

Entries are grouped by the **phase of work** they bite in. When you enter a phase,
read its section. Each entry is a short `### heading`, then **the trap** and **what
to do instead**.

To add an entry, see *Share what you learned* in the
[Contributing standards](../../AGENTS.md) — the bar and scoping rules live there, so
they stay in one place.

---

## When reading / exploring the code

### OpenLayers already handles the wrapping world — don't design around it

**The trap.** Anything that draws across the antimeridian — tracks, trails, routes,
laylines — invites the assumption that OpenLayers only understands longitudes
within `[-180, 180]`, and that Freeboard must therefore split geometry at ±180° to
get it drawn in every world copy. Designs built on that assumption end up splitting
a line for rendering and then rebuilding a parallel un-split copy so the `Modify`
interaction still sees one vertex per waypoint — a lot of machinery to work around
a limit OL does not have.

**What it actually does** (OL 10.x). The canvas vector renderer builds one replay
group and re-executes it once per visible world copy, translated by
`world * worldWidth` (`renderer/canvas/VectorLayer.js` → `renderWorlds`); it never
consults a feature's extent to decide whether to replicate it. `prepareFrame`
widens the feature query by a world on each side, and says so directly: *"To
support geometries in a coordinate range from -540° to +540°, we add at least 1
world width on each side of the projection extent."*

So **coordinates running continuously past ±180° are a supported input**, not a
workaround. Only geometry exceeding ±540° fails to render — in practice a track
that laps the globe, never a hand-built route.

**What to do instead.** Hand OL a continuously unwrapped line (`mapifyCoords` in
`src/app/modules/map/ol/lib/util.ts`) and let it place the world copies. Reach for
splitting only where geometry can exceed ±540° *and* nothing edits it — long tracks
and trails.

If a rendered geometry ever genuinely must differ from the editable one, override it
in the **style**, not on the feature. These three consumers read different
geometries:

| Concern | Geometry used | Where |
|---|---|---|
| Rendering | the **style** geometry | `renderer/vector.js` — `style.getGeometryFunction()(feature)` |
| Layer hit-testing | the rendered replay group | `renderer/canvas/VectorLayer.js` — `forEachFeatureAtCoordinate` |
| `Modify` interaction | the **feature** geometry | `interaction/Modify.js` — `feature.getGeometry()` |

A style `geometry` function runs on every render frame, so a `Modify` drag that
mutates the feature geometry re-derives the drawn form by itself — you keep live
feedback while editing, and no split vertex can ever reach saved data, without
maintaining a shadow feature.

---

## When coding

### Writing and then reading a signal in an `effect()` — it takes *two* effects to loop

**The trap.** An `effect()` that writes a signal and then reads it back does **not**
loop, which is exactly why this is dangerous: the reactive graph records the version
seen *at read time*, and a read after the write already has the current version, so
the effect never re-triggers itself. A single effect looks — and tests — completely
safe.

It goes wrong as soon as a **second** effect writes and reads that same signal.
Neither self-triggers, but each one's write invalidates the version the *other* one
recorded, so they re-trigger each other and ping-pong until the JS heap is exhausted.
The symptom is a hard browser lockup with nothing pointing at either effect.

That is #617: `ChartListComponent` had `effect(selectedCharts)` and
`effect(mapExtent)` both ending in `doFilter()`, which writes the `filteredList`
signal and then reads it back through `alignSelections()`. Each effect alone was
fine; together, one map move locked Freeboard up.

**What to do instead.** Treat an effect's trigger as deliberate, not incidental: read
only the signals that should *cause* the effect, and run everything else inside
[`untracked()`](https://angular.dev/api/core/untracked).

```ts
effect(() => {
  this.app.mapExtent();                      // the trigger
  untracked(() => this.doFilter());          // side effect — not a dependency
});
```

Reading the value non-reactively at the point of use (a snapshot, or `untracked()`
around the read itself) works too, and is the better fix when the write-then-read
lives in shared code that many callers reach.

**When debugging this,** don't try to reproduce it with one effect — it will pass.
You need both effects live, which usually means a real component fixture so signal
`input()`s can be set (`ComponentRef.setInput`); `TestBed.overrideComponent(Cmp, {
set: { template: '' } })` keeps that cheap when the loop is in the effects rather
than the view. Have the stubbed collaborator throw after a small number of calls, or
the runaway takes the vitest worker down with an out-of-memory crash instead of a
readable failure.

### Importing one field from a large JSON — use a *named* import

A default/namespace import (`import pkg from '../../package.json'`) ships the **whole
file** — `devDependencies`, `scripts`, everything — into the client bundle, and the
build stays green so it's invisible. Import the field by name instead
(`import { version } from '../../package.json'`) so esbuild drops the rest; add
`resolveJsonModule: true` to the base `tsconfig.json` for the type-check. Whole-file
import is fine only when you genuinely use all of it (e.g. `helper/openApi.json`).

### `mat-dialog-content` is already a 65vh scroll region — don't nest another

**The trap.** Angular Material's `.mat-mdc-dialog-content` ships with
`overflow: auto; max-height: 65vh` baked in. Give a child of it (a note body, a
description, any long block) its *own* `max-height` + `overflow-y: auto` and you
get two independent scrollbars for long content — the inner block scrolls, and the
dialog content scrolls around it.

**What to do instead.** Let `mat-dialog-content` be the single vertical scroller.
Style *within* it — scale wide media with `max-width: 100%`, etc. — rather than
capping height a second time. Only add an inner scroller when you specifically want
a sub-region that scrolls independently of the rest of the dialog.

### A control that "disappeared" may be a *sibling* row overflowing the card

**The trap.** `mat-card` (`.mat-mdc-card`) is `display: flex; flex-direction: column`.
A **non-wrapping** flex row inside it whose min-content is wider than the panel
forces the *whole card* wider than its container — and anything right-aligned in the
card's **other** rows (a checkbox, an icon button) is pushed off-screen. The symptom
is a control vanishing far from the change that caused it: adding one button to a
card's action row silently clipped the "Show in Map" checkbox in the row *above* it
(the AIS vessel list — a `feat` that widened the action row, caught later).

**What to do instead.** When a control goes missing after an unrelated-looking edit,
suspect horizontal overflow before deleted markup — confirm the element is still in
the DOM (it usually is), then find the widest sibling row and let it wrap
(`flex-wrap: wrap`) so the card can't exceed the panel width. Related trap in the
same components: `resourcelist.css` positions each scrolling list at a **hardcoded
`top:` px** that must manually track header height — add a header row (e.g. a filter
toggle line) and the list clips it unless you bump that offset too.

### Component surfaces styled from `--mat-sys-*` tokens go light in dark mode

**The trap.** FSK's Material theme is built with `define-theme` +
`all-component-themes` (`app-theme.scss`), which emit the `--mat-*` / `--mdc-*`
*component* tokens but **not** the Material-3 `--mat-sys-*` *system* palette
(`--mat-sys-surface`, `--mat-sys-on-surface-variant`, `--mat-sys-primary-container`,
…). A component that styles its own surfaces from `var(--mat-sys-surface, #fff)`
therefore always resolves to the **light fallback** — in *both* themes. It looks
right in the default light theme and under night mode (a global filter), so the bug
is invisible until someone opens it in the real dark theme: the app flips the dialog
chrome dark (via the component tokens, which *do* switch) while the component's own
surfaces, borders and text stay light — a white panel inside a dark dialog,
black-on-dark prose (Feature Browser issue #566).

**What to do instead.** Don't lean on `--mat-sys-*` for component-owned styling.
Dark mode is signalled by the `.dark-theme` class FSK adds to the CDK overlay
container (`app.component.ts`, `setDarkTheme()`), an *ancestor* of dialog content —
so reach it from an encapsulated component with `:host-context(.dark-theme)` and
supply the dark surface/text/border values there, leaving the light fallbacks for
the default theme. Don't treat dark mode as an edge case: iOS Safari follows the
system appearance and much of FSK's audience runs it on an iPad or iPhone, so this
path is exercised by real users constantly — verify any new panel or dialog in
**both** the light theme and OS dark mode before calling it done.

### Placing overlays / editing features in a non-primary world copy

**The trap.** OpenLayers pans horizontally without limit and renders every world
copy (wrapX), but the *interaction* code doesn't automatically follow. Two ways it
bites:

- **Popover placement.** `toLonLat()` normalises a click to `[-180, 180]`, throwing
  away *which* copy the user was looking at; `fromLonLat()` then rebuilds the
  overlay in the primary world, a world-width away from the feature clicked. (The
  same is true for a vessel/measure overlay that keeps updating.)
- **Vertex editing.** OL `Modify` hit-tests the feature's **raw geometry in
  view-space** and ignores world copies — its `wrapX` option only wraps the *sketch
  overlay*, not the segment rBush (`node_modules/ol/interaction/Modify.js` never
  reads `wrapX_`). So a vertex clicked in another copy matches nothing.

The seductive-but-wrong fix for editing is to shift the feature by the *clicked
world's* offset, `round(clickX / worldWidth)`. It fails for routes, because a route
that crosses the antimeridian is stored **unwrapped** (vertices past ±180). Clicking
its east end — rendered just past +180 — rounds to "world +1" and jumps the whole
route a world off-screen, so only half of it stays editable. This is the exact bug
that shipped in the first cut of #576.

**What to do instead.** Keep an explicit split between **render space** (EPSG:3857,
world-copy-aware — placement and hit-testing) and **data space** (canonical WGS84 in
`[-180, 180]` — everything stored/streamed). Carry a render-space **world offset**
and apply it only in Mercator; never let it become a lon/lat (it would leak an
out-of-range coordinate to the server). Concretely:

- Overlays: pass the click's `worldOffset` to `ol-overlay` and add it to the Mercator
  position; the canonical `position` is unchanged.
- Editing: align the feature to the copy the user clicked **by its extent centre**,
  not the click's absolute world — `worldCopyOffset(clickMercX − featureCentreX, W)`.
  That is 0 when you click the base rendering (even one drawn past ±180) and a whole
  world only for a genuine clone. A whole-world shift is visually transparent under
  wrapX, adds no vertices, and normalises back on save.

The shared helpers (`worldCopyOffset`, the event `worldOffset`, `ol-overlay`'s
`worldOffset` input) and the render-vs-data-space rule are in `AGENTS.md` and #576 —
route new placement/hit-test code through them rather than re-deriving with
`toLonLat`/`fromLonLat` or `±360` shifts.

### Adding a map-click behaviour alongside an OL `Modify`/`Draw` interaction — don't guard on `e.features`

**The trap.** When you add a `mapSingleClick` handler that must only fire when the
click *misses* a feature an OL interaction is already editing (e.g. "extend a route
by clicking open water, but leave clicks on the route to `Modify`"), the obvious
guard is the click event's own `e.features` — it's right there on the event. But
that list is built with the map's feature-selection tolerance
(`hitToleranceForPointer`, mouse **5**px / touch **15**px), while OL `Modify` acts
within its *own* `pixelTolerance` (**default 10**). Guard on `e.features` for a
mouse pointer and a click 6–10px from the line falls in the gap: `Modify` inserts a
vertex **and** your handler also fires — a double action from one click.

**What to do instead.** Run your own hit-test with a tolerance **≥ Modify's
`pixelTolerance`** — `this.olMap.getMap().getFeaturesAtPixel(e.pixel, { hitTolerance: 10 })`
(bump to the touch value for touch pointers) and match the edited feature by id.
`getFeaturesAtPixel` is world-copy aware, so it matches what the user sees under
wrapX. The same reasoning applies to any interaction with a configurable
`pixelTolerance`: reconcile *your* guard tolerance with the *interaction's*, not
with the map's selection tolerance. (Introduced with the route-extend feature,
#598.)

### A guard for "this gesture already acted" cannot be scoped to the gesture

**The trap.** Sooner or later a map click handler needs to know that the pointer
gesture producing it *already did something* — "the release that just deleted a
vertex must not also extend the route" (#608). The instinctive lifetime for that
marker is set-it-when-it-happens, clear-it-on the next `pointerdown`: one gesture,
one flag, tidy. It is silently racy.

OpenLayers dispatches `singleclick` on a **250 ms timer** (`MapBrowserEventHandler`),
and *nothing cancels that timer at `pointerdown`* — only the **next release**
collapses it into a `dblclick`. So a fast follow-up press starts a new gesture while
the previous gesture's click is still pending: the `pointerdown` clears the marker,
then the delayed click arrives and reads `false`. The guard silently does nothing,
and only for users who tap quickly — which is exactly the user deleting several
vertices in a row.

**What to do instead.** Let the marker outlive its gesture and retire it where the
*click* resolves, not where the next gesture starts. A gesture resolves as exactly
one of:

- **`singleclick`** — clear it after emitting, so consumers have read it first;
- **`dblclick`** — which cancelled the pending `singleclick`, so nothing else will;
- **a drag** — `dragging_` is sticky for the whole gesture and gates click
  emulation, so **a gesture that has dragged emits no click at all**, leaving its
  own marker with nothing to consume it.

**Scope that last one to the gesture that set the marker.** Drag and click are
mutually exclusive *within a gesture*, but not across gestures: a **later** gesture
can start dragging while the earlier delete's `singleclick` is still pending —
delete a vertex, then immediately pan the chart — and an unconditional clear on
`pointerdrag` retires a marker that was never consumed, so the pending click acts
anyway. Clear on drag **only** when the dragging gesture is the one that set the
marker.

Per-gesture identity has to come from your own side. `click`/`singleclick`/
`dblclick` all carry `MapBrowserEventHandler`'s `down_` clone as `originalEvent`,
so they can be correlated with each other — but a marker set *mid-gesture* (a
long-press) has no access to it, and `down_` is a fresh `new PointerEvent(...)`, so
an expando you attach to the DOM `pointerdown` does not survive into it. Stamp a
monotonic gesture id yourself at `pointerdown`, record it alongside the marker, and
compare.

More generally — **any** state you want a delayed map event to read must not be
cleared by a *later* input event, because on this map "later input" can precede
"earlier event". When in doubt, read OL's `MapBrowserEventHandler` for the event
you depend on: whether it is timer-delayed, and what actually cancels it.

---

## When testing

### `ng test` / `ng build` don't exit

**The trap.** The esbuild-based `ng test` and `ng build` complete successfully but
then fail to terminate — a lingering esbuild service keeps the event loop alive. In
CI that hangs the job to its timeout even though everything passed.

**What to do instead.** Use the exit-safe wrappers — `npm run test:ci` and
`npm run build:web` — never the raw Angular commands, for anything that must
terminate (CI, scripts, an agent verifying a change). Plain `npm test` stays as the
local watch command. (This is why those wrappers exist; see *Build, test, run* in
`AGENTS.md`.)

### Running a single spec file: not with bare vitest — use `ng test --include`

**The trap.** To iterate quickly on one test, the obvious move is
`npx vitest run src/app/.../foo.spec.ts`. It fails with
`Cannot find package 'src/app/...'`, because the `src/` path alias is **not**
resolved by a standalone vitest run — `vitest-base.config.ts` defines no
`resolve.alias` and no tsconfig-paths plugin. Rewriting the spec to use relative
imports doesn't rescue you either: the moment the spec imports anything from the
app graph, that code's own **transitive** `src/…` imports fail the same way.

**Why.** The `src/` alias is supplied by the Angular build pipeline (tsconfig
`paths`), which only applies when tests run through `ng test`. The vitest config the
project ships is intentionally minimal and assumes that pipeline.

**What to do instead.** Run through Angular so the alias resolves. For the whole
suite, the exit-safe wrapper:

```bash
npm run test:ci      # = ng test, with the force-exit wrapper
```

To iterate on **one** spec, you *can* filter — pass the file to `ng test`:

```bash
npx ng test --include "src/app/.../foo.spec.ts"
```

This goes through the Angular pipeline (alias resolves) and runs only that file.
The one catch: like all `ng test`/`ng build` invocations it **won't self-exit**
(see *`ng test` / `ng build` don't exit* above) — `test:ci` is wrapped, this raw
form is not. Background it, wait for the vitest `Test Files` summary, then kill it
(or just Ctrl-C). So **red→green-verifying a regression test is two single-file
runs**, not two full-suite runs — once with the fix reverted (new test fails), once
restored (it passes). Don't reach for `npx vitest` to shortcut it; that's the path
that fails on the alias.

### After backgrounding a non-exiting `ng` command, don't trust the shell's cwd

**The trap.** The two entries above leave you backgrounding `ng test` / `ng build`
routinely — they never self-exit, so that's the normal way to run them. But a
backgrounded command that outlives the call that started it can leave a *later*
command in the session running from a different working directory than you expect
— typically the repo/workspace root rather than the worktree you were in. The
commands themselves still look right in the transcript, so nothing signals the
drift until something resolves a relative path.

It is harmless for a read (`ls`, `grep` — you just get confusing output) and
dangerous for anything destructive. Real occurrence: `rm -rf public plugin`,
intended to clean a worktree's build outputs before a `build:all`, executed from
the workspace root instead. Nothing was lost only because no `public/` or
`plugin/` exists there — `rm -rf` on a non-existent path is a silent no-op, so
there was no error either way. The same slip one directory over is unrecoverable.

**What to do instead.** Once you have backgrounded a long-running command, stop
relying on inherited cwd — make every subsequent destructive or build command
carry its own absolute `cd`:

```bash
cd /abs/path/to/worktrees/<feature>/freeboard-sk && rm -rf public plugin && npm run build:all
```

Cheap habits that make the drift visible: chain `pwd &&` in front of a destructive
command, and prefer explicit paths (`rm -rf "$PWD/public"`) over bare relative
ones. This matters most in the worktree workflow, where several checkouts of the
same repo exist side by side and a relative path is valid — but wrong — in all of
them.

### Don't remove `isolate: true` from the vitest config

**The trap.** `vitest-base.config.ts` sets `isolate: true`, which costs the suite a few
seconds — a tempting thing to delete when trimming CI time. Don't. Angular's vitest
runner (`@angular/build:unit-test`) defaults to `isolate: false`: **one module registry
shared by every spec file in the run**, to align with the old Karma behaviour. The app
has a large web of barrel (`index.ts`) import cycles, so with a shared registry the
result depends on the order vitest happens to load files in. Whichever spec first enters
a cycle decides whether a transitively-imported component resolves or is still
`undefined`, and an `undefined` gets baked into that component's static `ɵcmp.imports`
for the **rest of the process**. `app.component.spec.ts` ("should create the app") — the
only spec that compiles the full app graph — is then the one that dies, with
`TypeError: Cannot read properties of undefined (reading 'ɵcmp')` and a stack pointing
at Angular's `TestBed` compiler rather than at any spec you touched.

It is entirely a test-environment artifact — production bundles in a stable order and is
unaffected — but it was a genuinely expensive one: as the suite grew past ~45 spec files
it was failing 3–4 of the 9 CI matrix legs on *every* push, with no platform pattern.

**What to do instead.** Leave isolation on. It makes the failure mode structurally
impossible: a fresh registry per spec file means no spec can corrupt another. Two
corollaries worth knowing:

- **A vitest `retry` cannot help with this class of bug.** Under a shared registry the
  corruption happens once at module-load and lasts the whole process, so an in-process
  retry re-runs the test body against the same broken modules. Only a fresh process
  (re-running the CI job) ever "retried" successfully.
- **Isolation contains the cycles between files, it does not remove them.** Inside a
  single spec, pulling in a second resolution path to something that also participates
  in the `src/app/modules` barrel — e.g. a deep `import { SKRoute } from
  'src/app/modules/skresources/resource-classes'` alongside a full component render —
  can still perturb evaluation order within that file. Prefer a minimal plain-object
  stub with only the fields the code under test reads.

### Unit-testing a DI-heavy service whose constructor calls `effect()`

**The trap.** Services like `PlotterExtensionService` inject a large facade
(`AppFacade`) plus several other collaborators, and call `effect()` in their
constructor. You can't just `new` the class in a spec: `effect()` requires an
Angular injection context, and the facade is far too heavy to hand-build. Going the
other way — bootstrapping the full app via `TestBed` with real providers — drags in
the entire dependency graph and is slow and brittle.

**What to do instead.** Use `TestBed` purely as an injection context, and stub each
constructor dependency with a minimal `useValue`:

```ts
TestBed.configureTestingModule({
  providers: [
    PlotterExtensionService,
    RouteBufferRegistry,                                  // cheap real class — fine
    { provide: AppFacade, useValue: { config: { plotterExtensions: { widgets } }, debug: () => {} } },
    { provide: SignalKClient, useValue: {} },
    { provide: MatDialog, useValue: {} },
    { provide: SKResourceService, useValue: { routes: signal([]) } },
    { provide: MapService, useValue: {} }
  ]
});
const service = TestBed.inject(PlotterExtensionService);
```

`TestBed.inject()` supplies the injection context `effect()` needs, and the stubs
keep the graph tiny. Only stub what the constructor (and the code under test)
actually touches — e.g. an `effect()` that reads `skres.routes()` needs that to be a
callable signal returning `[]`. Drive the real logic via public signals
(`service.manifests.set(...)`) and, where it earns its keep, a narrowly-cast call to
a private method to exercise the genuine code path rather than faking its output.

> Import path: in a spec, import collaborators with **relative** paths
> (`../../app.facade`), not the `src/` alias — see *Running a single spec file*.

> **If your spec `await`s, stub for the constructor effects too.** "Only stub what
> the constructor and code under test touch" holds for a **synchronous** spec —
> `TestBed.inject()` alone does not flush `effect()`s, so a sync spec like
> `plotterext.occupancy.spec.ts` never runs them. But the moment your test `await`s
> (a real handshake, a timer, anything async), Angular's effect scheduler gets a
> chance to flush and **every** constructor `effect()` runs — throwing an
> **uncaught** exception on anything it reads that you didn't stub (e.g. the
> night-mode effect calls `readNightMode()`, which reads `app.uiCtrl()` and
> `app.config.display.nightMode`). The tell is a spec whose tests report **passed**
> but with `Uncaught Exception` errors in the run output. Fix: stub deep enough for
> every constructor effect, not just the code under test.

---

### Unit-testing a function that lives *inside* the stream worker

**The trap.** The logic you want to test (e.g. `apiGet`, `getVesselTrail`) is a
module-private function in `skstream.worker.ts`. There's no facade to reach it
through, and the file is a Web Worker entry — it calls `addEventListener('message',
…)` at top level — so it *looks* untestable without spinning up a real `Worker` and
driving `postMessage`.

**What to do instead.** Just `export` the function and import it directly in a
co-located `*.spec.ts`. Importing the worker module in a test is safe: the suite
runs under jsdom with `@vitest/web-worker` in `setupFiles` (see
`vitest-base.config.ts`), so the top-level `addEventListener` resolves against the
jsdom global and is a harmless no-op — you do **not** need a `Worker` or
`postMessage`. Stub browser globals the function uses with `vi.stubGlobal` (e.g.
`fetch`), and `vi.restoreAllMocks()` in `afterEach`:

```ts
import { expect, describe, it, vi, afterEach } from 'vitest';
import { apiGet } from './skstream.worker';

afterEach(() => vi.restoreAllMocks());

it('...', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) =>
    Promise.resolve({ json: () => Promise.resolve({ url }) } as unknown as Response)
  ));
  await expect(apiGet('/x')).resolves.toEqual({ url: '/x' });
});
```

Adding an `export` for a worker-internal helper doesn't change its runtime
behaviour (the worker still calls it directly), so it's a cheap, honest seam.

---

## When building & running locally

### Build outputs are gitignored

**The trap.** `public/` (the webapp) and `plugin/` (the compiled helper) are build
outputs and are **gitignored** — they won't be in a clean checkout.

**What to do instead.** Build them with `npm run build:web` / `npm run build:helper`
(or `build:all`). The server serves `public/` at the package mount point; see
[`docs/signalk/extension-model.md`](../signalk/extension-model.md) for the base-path
rule.

### Linking the FSK checkout into a server needs `build:all`, not just `build:web`

**The trap.** The package is *both* a `signalk-webapp` and a
`signalk-node-server-plugin`, and its `package.json` `main` is `plugin/index.js`. If
you symlink an FSK dev checkout into a server's `node_modules` with only the webapp
built (`build:web`), the server crashes during plugin registration with
`MODULE_NOT_FOUND` for `…/@signalk/freeboard-sk/plugin/index.js` — the webapp loads
fine, but the missing helper build takes the whole plugin scan down with it, so the
failure looks unrelated to Freeboard.

**What to do instead.** Build **both** sides before linking: `npm run build:all` (or
run `build:helper` alongside `build:web`). The helper compiles to `plugin/`, which is
what `main` resolves to.

---

## When submitting a PR

### A PR title is literally a line in the App Store Changelog

**The trap.** Freeboard's App Store "Changelog" tab is generated from PR titles, not
from any hand-written changelog.

**What to do instead.** Treat the title as a release note. The chain is *PR title →
GitHub auto-generated release notes (on a `v*` tag) → App Store Changelog tab*,
colour-coded by `feat`/`fix`/breaking prefix. This is the real reason the
`type(scope):` title convention and one-change-per-PR rule matter so much. (Details:
[`docs/signalk/plugin-publishing.md`](../signalk/plugin-publishing.md).)

### CodeRabbit reviews the PR branch, not the merged result

**The trap.** CodeRabbit diffs against the merge-base and reads context from the
head branch — so if `master` moved after you branched, CR (and CI) reason about a
stale tree and may flag issues already fixed elsewhere.

**What to do instead.** Rebase onto current `master` before relying on a re-review
(`git fetch && git rebase origin/master`, force-push).

### Waiting on a CodeRabbit review — poll the review endpoints, not its prose

Relevant if you script the wait (an agent polling a PR, a CI helper); a human
watching the page sees the comments appear and none of this bites.

**The trap.** Two plausible-looking signals both fail:

- **Grepping the summary comment for wording.** CodeRabbit's summary issue-comment
  does *not* reliably contain "no actionable comments", "Nitpick" or similar — a
  review can complete with its findings only in the review body and inline
  comments, leaving the summary with none of the phrases you matched on. A poller
  gated on that text waits forever on a review that finished minutes ago.
- **Waiting for a rate-limited review to resume by itself.** It never does. When
  CodeRabbit declines to start, that push has spent its trigger: once the window
  passes it does **not** come back to the PR, so a poller waiting for it to
  restart waits forever. The notice also carries **no number** — "wait until the
  next included review is available" — so there is nothing to parse into a
  deadline either.

**What to do instead.** Watch both signals, because each catches a different
outcome. A count higher than before your push on
`GET /repos/{owner}/{repo}/pulls/{n}/reviews` or `.../pulls/{n}/comments` means
the review landed **with findings** — compare against a baseline, not against
empty, since a re-review adds to what the first one left. But a **clean**
re-review adds nothing to either endpoint, so an unchanged count is not evidence
of anything; there its only trace is CodeRabbit's summary comment updating to
*Review finished* / *no actionable comments*. Poll the counts for findings and
the summary for completion.

After a rate-limited review you must **ask again by hand** — post
`@coderabbitai review` as a PR comment once the window has passed. Since the
notice gives no figure, there is no way to know when that is except to try; if it
is refused again, wait longer and repeat. And remember the green **CodeRabbit**
status check means "the integration ran", not "a review happened" — it is green
for a rate-limited non-review too, with the description reading *Review rate
limited*.

### The Prettier CI gate covers only `ts|html` — don't `prettier --write` the CSS

**The trap.** CI's format check runs `format:check` =
`prettier --check "src/**/*.+(ts|html)"`, so **CSS/SCSS are out of scope**, and the
repo's `.css` files use **4-space** indent (not Prettier's 2). Run a bare
`npx prettier --write some.css` — or even `--check`, which flags every CSS file — and
Prettier reformats the *entire* file to 2-space, burying your one-line change in a
whole-file diff CI never asked for.

**What to do instead.** Edit `.css` by hand in the file's existing 4-space style;
don't run Prettier on it. Only `ts`/`html` go through Prettier (`npm run format`).

---

## Environment-specific

Lessons that apply to a class of setups rather than everyone. Scope each by the
condition that makes it relevant (e.g. *"If you're developing on Windows, …"*, *"If
your charts live on a Raspberry Pi microSD, …"*).

_No entries yet — add one when a platform or hardware quirk bites you._
