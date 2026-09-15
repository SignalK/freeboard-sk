# Freeboard-SK

Freeboard-SK (`@signalk/freeboard-sk`) is the primary chart-plotter web app for the
[Signal K](https://signalk.org/) ecosystem. It is an **Angular** application served
by a Signal K server as a `signalk-webapp`, and it ships a small companion
`signalk-node-server-plugin` (the "helper") in the same package.

These guidelines are written for AI coding assistants, but they apply equally to
human contributors. Where something is "overly specific," it's an explicit guardrail
for AI tools — humans should use judgment and follow the spirit.

This file is the complete contributor contract: everything a PR is expected to do
is stated here, on the assumption that a contributor's agent may be the only thing
that reads it. [`CONTRIBUTING.md`](CONTRIBUTING.md) is the shorter, human-readable
walk-through of the same steps — nothing there is a requirement that isn't also
here.

This project is an **upstream Signal K project** (`SignalK/freeboard-sk`). It has a
large, often non-technical user base, so changes warrant extra care.

## Repository layout

| Path | What |
|------|------|
| `src/app/` | the Angular webapp; feature areas under `src/app/modules/` (`map`, `skresources`, `plotterext`, `autopilot`, `radar`, `weather`, `gpx`, `settings`, …) |
| `helper/` | the companion server plugin (TypeScript) |
| `scripts/` | build/test wrappers (`build-web.mjs`, `test-ci.mjs`) — see *Build/test* |
| `dev-tools/` | developer-only tooling, **never shipped** (excluded by the package `files` whitelist, and not an npm workspace). e.g. `fsk-mcp/` — an MCP bridge that lets an agent drive a running Freeboard (see *Build, test, run*) |
| `docs/` | the documentation set this file indexes |
| `public/` | build output: the webapp (served by the SK server at `/@signalk/freeboard-sk/`) — gitignored |
| `plugin/` | build output: the compiled helper plugin — gitignored |
| `.github/workflows/ci.yml` | CI: calls the shared Signal K `plugin-ci` workflow |

## Build, test, run

Node `>=18`. Install with `npm i`. Angular `21`.

| Command | Use |
|---------|-----|
| `npm start` / `ng serve` | dev server at `http://localhost:4200` with live reload |
| `npm run build:web` | build the **webapp** → `public/` (use this, not raw `ng build` — see below) |
| `npm run build:helper` | build the **helper plugin** → `plugin/` |
| `npm run build:all` / `build:prod` | both (what CI builds, what `npm pack` runs) |
| `npm run test:ci` | run unit tests once and **exit** (what CI runs — see below); add `-- --include "<spec>"` to run a single file |
| `npm test` | `ng test` in watch mode (local dev only — does not exit) |
| `npm run format` | Prettier over `src/` (and `format:all` for `helper/` too) |

> **Why `build:web` / `test:ci` exist (important).** Angular's esbuild-based
> `ng build` / `ng test` complete successfully but then **fail to terminate** — a
> lingering esbuild service keeps the event loop alive. In CI that hangs the job to
> its timeout *even though everything passed*. The `scripts/build-web.mjs` and
> `scripts/test-ci.mjs` wrappers run the Angular command, detect the
> success/summary, and force-exit. **Always use `npm run build:web` and
> `npm run test:ci` for anything that must terminate** (CI, scripts, an agent
> verifying a change). Plain `npm test` stays as the local watch command.

**Pointing the dev server at a server:** in dev mode the app connects to the
Signal K server in the browser URL. To target a specific server while running
`ng serve`, edit the `DEV_SERVER` object (`host`/`port`/`ssl`) in
`src/app/app.facade.ts`. This applies in **development mode only**. See
[`docs/signalk/local-dev-environment.md`](docs/signalk/local-dev-environment.md)
for running a local Signal K server to develop against.

### Driving Freeboard from an agent — `dev-tools/fsk-mcp`

To have your agent control a running Freeboard directly while debugging — set the
map view, inspect and edit routes, push resource filters, read live data — install
the bundled MCP bridge in [`dev-tools/fsk-mcp/`](dev-tools/fsk-mcp/). It exposes the
Plotter Extensions host API as MCP tools, so "put the chart here at this zoom, then
tell me what's rendered" becomes a tool call instead of a manual click-through. The
one-time wiring (link the plugin, enable it, point your agent at the MCP endpoint)
is in [`docs/dev-tools/fsk-mcp.md`](docs/dev-tools/fsk-mcp.md); it's dev-only and
never shipped.

**Keep it in sync with the host API.** When you add or change a Plotter Extensions
host API method (the `map.*` / `route.*` / `resources.*` / … surface in
[`docs/api/plotter-extensions-api.md`](docs/api/plotter-extensions-api.md)), add or
update the matching tool in `dev-tools/fsk-mcp/src/tools.js` so agents can exercise
the new behaviour. (`fsk_call` already reaches any method generically; the curated
tools exist for clean, discoverable schemas — that file is the single place they
live.)

## Code quality

- **Scope discipline.** Make only the change requested or clearly necessary. A bug
  fix doesn't need surrounding code cleaned up; a small feature doesn't need extra
  configurability. Don't add error handling for cases that can't happen — validate
  at boundaries (user input, server responses), trust internal code.
- **Self-documenting code.** Comments explain *why*, not *what*. No echo comments.
  Documentation describes current state, not development history.
- **TypeScript.** New code is TypeScript with real types; avoid `any`. Reuse
  existing types over inventing local ones.
- **Angular conventions.** Standalone components and **signals** are the norm here.
  Prefer signals/`computed`/`effect` over manual change detection. Keep components
  focused; push logic into services.
- **Logging.** Use `console.warn` (not `console.error`) for *recoverable*
  feature-detection failures, and `this.app.debug()` for internal state tracing —
  not `console.log`.
- **Displaying values → `formatValueForDisplay()`.** Render every user-facing numeric
  value through `app.formatValueForDisplay(value, sourceUnit, { path })`. It applies the
  user's unit preferences — a per-path server override (`meta.displayUnits`) when a
  `path` is given, otherwise the category preset — and returns the value with its
  symbol. Pass `path` whenever the value maps to a Signal K path; derived/computed
  values omit it. Don't call `Convert` directly for display — `Convert` is the pure
  primitive for geometry and numeric math only. See
  [`docs/signalk/unit-preferences.md`](docs/signalk/unit-preferences.md).
- **Map coordinates → keep render space and data space separate.** The map deals
  with two coordinate spaces and must not confuse them:
  - **Data space** — canonical WGS84 in `[-180, 180]`. Everything persisted to the
    Signal K server, streamed, displayed, or read by another app. GeoJSON requires
    it (RFC 7946 §3.1.9); a stored longitude of `197` is malformed and other
    consumers may reject it. **Normalise at every data boundary** (`toLonLat`
    already does this on the way in; the save path re-normalises on the way out).
  - **Render space** — EPSG:3857 Mercator, world-copy-aware. OpenLayers pans
    horizontally without limit and replicates geometry into every visible world
    copy out to ±540° (see the *reading / exploring* lesson on the wrapping world),
    so a click east/west of the primary world carries an x outside one world width.
    This offset is what lets a popover or an edited vertex land in the copy the user
    is actually looking at.
  - **The rule.** When you convert a pointer event to a coordinate, place an
    overlay, or hit-test/​edit a feature, carry the **world offset** in render space
    and apply it in Mercator — never bake it into a lon/lat (that would leak an
    out-of-range value toward storage). The shared machinery: `worldCopyOffset()`
    (`ol/lib/util.ts`) computes the offset; map click events carry it as
    `worldOffset`; `ol-overlay`'s `worldOffset` input places an overlay in that copy
    while its `position` stays canonical; `Modify` edits shift the feature by a
    whole-world offset (visually transparent under wrapX, normalised on save). Route
    them through these rather than re-deriving with ad-hoc `toLonLat`/`fromLonLat`
    or `±360` shifts — that fragmentation is exactly what #572 consolidated.
- **Tests.** New behaviour needs tests where the test infrastructure supports it
  (`*.spec.ts`, run via `npm run test:ci`). Test behaviour, not implementation.

## Contributing — PR standards

History note: many older PRs lack descriptions, tests, or a clean title. Don't
continue that. The bar below is what "done correctly" means here.

### The PR lifecycle, in order

The bullets after this list say *what* a good PR looks like; this is the sequence.
**A PR is not finished when it is opened** — steps 7 and 8 happen afterwards, and a
PR that stops at step 6 will not be merged.

1. **Fork** `SignalK/freeboard-sk` (contributors cannot push to it directly) and
   branch from the latest `master`.
2. As you enter each phase — reading, coding, testing, building — skim the matching
   section of the lessons log (see *Hard-won knowledge* below).
3. Do the work: one logical change, tests for new behaviour, no version bump.
4. Before every push run, in this order: `npm run format` → `npm run build:all` →
   `npm run test:ci`. CI runs `format:check` as a gate, so unformatted code fails on
   the very first push.
5. Commit as `type(scope): subject` (same convention as PR titles, below), one
   meaningful step per commit, with a message that says *why*. Keep every commit.
6. Open the PR against `SignalK/freeboard-sk:master` with the template filled in:
   the title (it becomes a release-notes line), *What changes for the user?* in
   real sentences, before/after screenshots for UI changes. **Do not edit
   `features/`** — that corpus is maintainer-owned and compiled after merge.
7. **Wait for CodeRabbit, and confirm it actually reviewed.** CodeRabbit normally
   starts within minutes of the push, but reviews are **rate-limited per repository**
   — a small number of included reviews per hour, shared across every open PR. When
   the budget is spent it posts a notice *instead of* a review — *"Review rate
   limited … Next included review available in N minutes"* — and **the CodeRabbit
   status check still shows green** (it means the integration ran, not that a review
   happened). **A rate-limited review never resumes on its own**: the push that hit
   the limit has spent its trigger. Since no PR is merged without a completed
   CodeRabbit review, re-requesting is the contributor's job: read `N` from the
   notice, set a timer, and once it has passed post `@coderabbitai review` as a PR
   comment. If it is refused again, a fresh notice with a fresh figure appears —
   repeat against that. Don't push further commits while a review is running or
   while you are waiting out a window; every push draws on the same budget. Take
   "review complete" from CodeRabbit's summary comment (edited in place as it works),
   never from the status check. Mechanics for scripting the wait are in the lessons
   log under *Waiting on a CodeRabbit review*.
8. **Give every finding an explicit disposition** — fix it, or rebut it on its
   thread (details below). Push fixes as new commits with a plain `git push`. Only
   then is the PR ready for maintainer review.

> **If you are a human delegating this to an agent:** an agent's session usually
> ends when the PR is opened, so the CodeRabbit review (or the rate-limit notice)
> lands after it has stopped and it will not see it by itself. Steps 7–8 are yours
> to trigger — come back to the PR, and hand the review or the notice to the agent.

- **One logical change per PR.** Refactors and behaviour changes go in separate
  PRs. If the change would be two lines in a changelog, it's two PRs — split them
  *before* opening, even if you did them together. **Proactively enforce this:** if
  asked for something unrelated to the current PR, suggest a separate PR rather than
  silently bundling it.
- **PR titles are release notes.** Freeboard's App Store "Changelog" is generated
  from PR titles (see *Hard-won knowledge*). Use `type(scope): short imperative
  subject` (lowercase, no period); types `feat|fix|perf|refactor|docs|test|chore`;
  scope = the area (`map`, `routes`, `charts`, `plotterext`, `deps`, …). Ask: "if
  someone read only the title, would they understand what this does?"
- **PR descriptions: succinct, why + how, not what.** The diff shows *what*. Don't
  pad with mechanics, changed-line lists, version numbers, or self-congratulation —
  maintainers should not have to wade through AI fluff. Call out breaking changes.
  If you include a test-plan checklist, **every box must be checked** before review.
  Include before/after screenshots for visible UI changes.
- **Tests + CI must pass.** Add/extend `*.spec.ts` for new behaviour. CI runs the
  shared Signal K `plugin-ci` workflow (`build:all` + `test:ci`) across a
  Linux/macOS/Windows + arm matrix; it must be green.
- **Never change version numbers.** Maintainers own versioning and publish releases.
- **Branch from latest `master`; rebase, never merge.** When updating with upstream:
  `git fetch && git rebase origin/master`, force-push. That rebase is the *only*
  routine reason to force-push a PR branch.
- **Keep the individual commits — never squash the branch.** Don't flatten the work
  into a single commit before opening, and don't amend review fixes into earlier
  commits afterwards — push those as new commits with a plain `git push`. Maintainers
  squash when they merge, so pre-squashing gains nothing, and it costs the two things
  the history is there for: CodeRabbit re-reviewing incrementally instead of in full
  (re-reviews are rate-limited), and a reviewer's "changes since last review" view.
  Write each commit message to explain *why*; on a contributor PR that sequence is
  frequently the only record of how the design moved.
- **CodeRabbit reviews PRs automatically — give every finding an explicit
  disposition.** Either fix it, or reply on that thread saying why it doesn't apply.
  **Don't leave a finding silently unanswered**, and don't treat a PR as ready for
  maintainer review while any thread is still open. Two reasons this matters:
  - **CodeRabbit learns from rebuttals.** A reply explaining why a finding is wrong
    becomes a project-level note, and it stops raising that class of objection on
    later PRs. A good rebuttal permanently improves review quality for everyone;
    silence teaches it nothing, and the same false positive comes back next time.
  - **Silence is unreadable to a maintainer.** On your own PR you know which findings
    you fixed and which you judged not to apply. From the outside those are
    indistinguishable from findings you never opened — so the reasoning has to be
    written on the thread, not held in your head.

  Rebutting is a perfectly good outcome — CodeRabbit is not always right, and a
  clear "this can't happen because X" is more useful than a defensive change. What
  isn't acceptable is leaving it unanswered. A PR needs at least one completed
  CodeRabbit review, with every finding disposed of, before it can be merged — and
  if the review was rate-limited at open time, that includes re-requesting it (step
  7 of *The PR lifecycle* above); a rate-limited notice is not a review.
- **Share what you learned — keep the lessons log alive.** If working on your PR
  surfaced something non-obvious about developing FSK locally (a toolchain trap, a
  test-setup gotcha, a platform or hardware quirk), add it to
  [`docs/freeboard/DEV-LESSONS-LEARNED.md`](docs/freeboard/DEV-LESSONS-LEARNED.md)
  so the next contributor doesn't rediscover it. The bar is *non-obvious and
  reusable*, **not** *universal*: lessons that apply to a whole class of setups are
  welcome — just scope them with the condition that makes them relevant ("If you're
  developing on Windows, …", "If your charts live on a Raspberry Pi microSD, …").
  Skip anything truly unique to your one machine. Add it in its own small
  `docs(lessons): …` PR. When an existing entry has gone **wrong or stale** — the
  tooling or code moved, or it's genuinely unclear — fix or prune it the same way:
  verify it actually misleads first (it bit you, or you checked it against current
  code/tooling), then correct it (or remove it if obsolete) with a one-line note on
  what changed. Don't reword on suspicion or for style — the bar for editing is the
  same as for adding.

## Hard-won knowledge → read the lessons log

The non-obvious, time-wasting traps that took real effort to discover live in
[`docs/freeboard/DEV-LESSONS-LEARNED.md`](docs/freeboard/DEV-LESSONS-LEARNED.md),
grouped by the **phase of work** they bite in. **Read it — skipping it wastes real
time and tokens.** As you enter each phase, (re-)read the matching section:

- *reading / exploring the code* · *coding* · *testing* · *building & running
  locally* · *submitting a PR* — plus *environment-specific* lessons scoped by
  condition (Windows, Raspberry Pi microSD, …).

Hit a new trap? Add it back — see *Share what you learned* under
*Contributing — PR standards* above.

## DeepWiki (warm up your context)

[DeepWiki](https://deepwiki.com/) maintains an AI-readable wiki of this repo and
**re-scans Freeboard-SK weekly**, so it's a fast way to orient before diving into
the code. Use the DeepWiki MCP (or the web URLs) before guessing at architecture:

| Repo (MCP name) | URL | For |
|---|---|---|
| `SignalK/freeboard-sk` | https://deepwiki.com/SignalK/freeboard-sk | Freeboard architecture, modules, data flow |
| `SignalK/signalk-server` | https://deepwiki.com/SignalK/signalk-server | server architecture, plugin system, REST/WS APIs |
| `SignalK/specification` | https://deepwiki.com/SignalK/specification | path semantics, delta/full formats, schema |

## Documentation index

**Freeboard-specific** (`docs/freeboard/`):
- [`feature-browser.md`](docs/freeboard/feature-browser.md) — the Feature Browser and
  its `features/` corpus + change ledger. **`features/` is maintainer-owned: do not
  add or edit feature docs or `changelog.json` in a contributor PR** — describe the
  user-facing change in the PR description instead, and the corpus is compiled after
  merge. The doc covers the model, the category list, and the maintainer contract for
  recording a change.
- [`freeboard-plotter-ext-support.md`](docs/freeboard/freeboard-plotter-ext-support.md)
  — Freeboard's host implementation of the Plotter Extensions API (incl. the
  `routes` capability).
- [`freeboard-symbol-support.md`](docs/freeboard/freeboard-symbol-support.md) — how
  Freeboard consumes custom map symbols.
- [`DEV-LESSONS-LEARNED.md`](docs/freeboard/DEV-LESSONS-LEARNED.md) — the lessons
  log: non-obvious, repo-specific traps grouped by work phase (reading, coding,
  testing, building, PR). The *Hard-won knowledge* section above points here; read
  the section matching your current phase.

**Host-agnostic API specs** (`docs/api/`):
- [`plotter-extensions-api.md`](docs/api/plotter-extensions-api.md) — the Plotter
  Extensions API contract.
- [`plotter_extension_provider_plugins.md`](docs/api/plotter_extension_provider_plugins.md)
  — guide for plugin authors providing extensions.
- [`symbols-api.md`](docs/api/symbols-api.md) — the `symbols` resource type.

**General Signal K knowledge** (`docs/signalk/`) — *skip any you already know; they
exist so contributors new to the Signal K ecosystem don't burn context relearning
it*:
- [`extension-model.md`](docs/signalk/extension-model.md) — how the server
  discovers and serves plugins/webapps.
- [`local-dev-environment.md`](docs/signalk/local-dev-environment.md) — running a
  local server and linking a dev build into it.
- [`plugin-publishing.md`](docs/signalk/plugin-publishing.md) — packaging for npm
  and the App Store.
- [`unit-preferences.md`](docs/signalk/unit-preferences.md) — displaying values in the
  user's preferred units via `formatValueForDisplay()`. Read before adding or changing
  any UI that shows a numeric value.

**Developer tooling** (`docs/dev-tools/`):
- [`fsk-mcp.md`](docs/dev-tools/fsk-mcp.md) — one-time setup for the `dev-tools/fsk-mcp`
  MCP bridge that lets an agent drive a running Freeboard-SK (map view, routes,
  filters, live data) during debugging. Read once when wiring it up.
- [`release-notes.md`](docs/dev-tools/release-notes.md) — the `dev-tools/changelog`
  generator: `stamp` (fill/graduate `since`) + `render` (grouped Release body) from
  the feature ledger; wired into `release.yml`.
